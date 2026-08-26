const { sendPrivateReply, sendDirectMessage } = require('./instagram');
const { getDb, getConfig } = require('../database');

const queue = [];
let isProcessing = false;
let currentInterval = 3000; // 3 seconds baseline
let timerId = null;

function enqueue(job) {
    if (!job.processAt) {
        job.processAt = Date.now();
    }
    queue.push(job);
    if (!isProcessing) {
        startProcessing();
    }
}

function getQueueDepth() {
    return queue.length;
}

function startProcessing() {
    if (isProcessing) return;
    isProcessing = true;
    processNext();
}

async function processNext() {
    if (queue.length === 0) {
        isProcessing = false;
        return;
    }

    const now = Date.now();
    const readyIdx = queue.findIndex(j => j.processAt <= now);
    
    if (readyIdx === -1) {
        timerId = setTimeout(processNext, 2000);
        return;
    }

    const [job] = queue.splice(readyIdx, 1);
    const token = getConfig('access_token');

    try {
        let result;
        if (job.type === 'private_reply') {
            result = await sendPrivateReply(token, job.commentId, job.messageText);
        } else if (job.type === 'direct_message') {
            result = await sendDirectMessage(token, job.recipientId, job.messageText);
        }

        if (job.eventId) {
            getDb().prepare("UPDATE events SET dm_status = 'delivered', dm_message_id = ? WHERE id = ?")
                .run(result?.id || 'msg_' + Date.now(), job.eventId);
        }

        currentInterval = 3000;
        console.log(`[Queue] Successfully processed job for event ${job.eventId}`);
    } catch (err) {
        console.error(`[Queue] Failed to process job for event ${job.eventId}:`, err.message);
        
        if (job.eventId) {
            getDb().prepare("UPDATE events SET dm_status = 'failed' WHERE id = ?")
                .run(job.eventId);
        }

        if (err.response && err.response.status === 429) {
            console.warn('[Queue] Rate limit hit. Backing off...');
            currentInterval = Math.min(currentInterval * 2, 60000);
        }
    }

    timerId = setTimeout(processNext, currentInterval);
}

module.exports = {
    enqueue,
    getQueueDepth
};
