/**
 * 解密 Worker - 将 Argon2id + AES-GCM 解密移到 Worker 线程
 */
import { Encryptor } from '@common/encryptor'

type DecryptWorkerMessage =
	| { type: 'init'; password: string }
	| { type: 'decrypt'; password: string; buffer: ArrayBuffer; requestId: number }

const workerSelf = self as unknown as {
	/**
	 * 向主线程发送 Worker 处理结果。
	 * @param message 结果消息。
	 * @param transfer 需要转移所有权的对象。
	 */
	postMessage(message: any, transfer?: Transferable[]): void
	/** 主线程消息处理函数。 */
	onmessage: ((event: MessageEvent<DecryptWorkerMessage>) => void | Promise<void>) | null
}

let _enc: Encryptor | null = null
let _password = ''
let _running = false
const _queue: Array<{ password: string; buffer: ArrayBuffer; requestId: number }> = []

/**
 * 根据密码创建或复用解密器。
 * @param password 文件解密密码。
 */
function setPassword(password: string) {
	if (!_enc || _password !== password) {
		_password = password
		_enc = new Encryptor({ key: password })
	}
}

/**
 * 串行消费解密队列，并将解密结果或错误发送到主线程。
 */
async function runQueue() {
	if (_running) return

	_running = true
	try {
		while (_queue.length) {
			const task = _queue.shift()!
			try {
				setPassword(task.password)
				const decrypted = await _enc!.decryptArrayBuffer(task.buffer)
				workerSelf.postMessage({ type: 'decrypt', requestId: task.requestId, buffer: decrypted }, [decrypted])
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err)
				workerSelf.postMessage({ type: 'error', requestId: task.requestId, error: message })
			}
		}
	} finally {
		_running = false
	}
}

/**
 * 接收主线程的初始化或解密消息。
 * @param event Worker 消息事件。
 */
workerSelf.onmessage = async (event) => {
	const d = event.data
	if (d.type === 'init') {
		setPassword(d.password)
		workerSelf.postMessage({ type: 'init', ok: true })
		return
	}

	if (d.type === 'decrypt') {
		_queue.push({
			password: d.password,
			buffer: d.buffer,
			requestId: d.requestId
		})
		await runQueue()
	}
}
