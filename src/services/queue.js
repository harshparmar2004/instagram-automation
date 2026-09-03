const { sendPrivateReply, replyToComment, sendDirectMessage } = require('./instagram');
const { getDb, getConfig } = require('../database');

const queue = [];
let isProcessing = false;
let currentInterval = 1000; // 1 second baseline for fast, responsive delivery
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
        timerId = setTimeout(processNext, 1000);
        return;
    }

    const [job] = queue.splice(readyIdx, 1);
    const token = getConfig('access_token');

    try {
        let result;
        if (job.type === 'private_reply') {
            // 1. Post public comment reply on the post (if configured)
            if (job.publicReply) {
                try {
                    await replyToComment(token, job.commentId, job.publicReply);
                } catch(pe) {
                    console.warn(`[Queue] Public reply notice for event ${job.eventId}:`, pe.message);
                }
            }

            // 2. Dispatch real Instagram Direct Message (Private Reply)
            result = await sendPrivateReply(token, job.commentId, job.commenterId, job.messageText);
        } else if (job.type === 'direct_message') {
            result = await sendDirectMessage(token, job.recipientId, job.messageText);
        }

        if (job.eventId) {
            getDb().prepare("UPDATE events SET dm_status = 'delivered', dm_message_id = ? WHERE id = ?")
                .run(result?.id || result?.message_id || 'msg_' + Date.now(), job.eventId);
        }

        currentInterval = 1000;
        console.log(`[Queue] ✅ Successfully dispatched DM for event ${job.eventId}`);
    } catch (err) {
        console.error(`[Queue] ❌ Failed to dispatch DM for event ${job.eventId}:`, err.message);
        
        if (job.eventId) {
            getDb().prepare("UPDATE events SET dm_status = 'failed' WHERE id = ?")
                .run(job.eventId);
        }

        if (err.response && err.response.status === 429) {
            console.warn('[Queue] Meta Rate limit hit. Backing off...');
            currentInterval = Math.min(currentInterval * 2, 60000);
        }
    }

    timerId = setTimeout(processNext, currentInterval);
}

module.exports = {
    enqueue,
    getQueueDepth
};
