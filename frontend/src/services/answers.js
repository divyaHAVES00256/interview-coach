// src/services/answers.js
// BFF service layer for answer submission, score polling, and session results.

const BASE = '/api/v1/answers'

/**
 * Submit a recorded answer for a given question.
 * @param {number} questionId
 * @param {string} transcript  
 * @param {number} audioDuration 
 * @returns {Promise<{ answer_id: number, processing_status: string }>}
 */
export async function submitAnswer(questionId, transcript, audioDuration) {
  const res = await fetch(`${BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: questionId,
      transcript,
      audio_duration: audioDuration,
    }),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/**
 * Poll GET /api/v1/answers/{answerId}/score every 3 s until the status
 * @param {number} answerId
 * @returns {Promise<object>}
 */
export function pollScore(answerId) {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/answers/${answerId}/score`, {
          credentials: 'include',
        })
        if (!res.ok) {
          clearInterval(intervalId)
          reject(new Error(await res.text()))
          return
        }
        const data = await res.json()

        // Keep polling while the backend is still working
        if (data.processing_status === 'pending' || data.processing_status === 'scoring') {
          return
        }

        // Terminal states
        clearInterval(intervalId)
        if (data.processing_status === 'failed') {
          resolve({ processing_status: 'failed' })
        } else {
          // "scored" or any other success state – return full object
          resolve(data)
        }
      } catch (err) {
        clearInterval(intervalId)
        reject(err)
      }
    }, 3000)
  })
}

/**
 * Fetch the full results for a completed session.
 * @param {number|string} sessionId
 * @returns {Promise<object>} SessionResultsResponse
 */
export async function getSessionResults(sessionId) {
  const res = await fetch(`/api/v1/results/${sessionId}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}