import { EventEmitter } from 'events'
import type { RealtimeEvent } from '../../shared/realtimeTypes.js'

const emitter = new EventEmitter()

export const publish = (event: RealtimeEvent): void => {
  emitter.emit('event', event)
}

export const onEvent = (handler: (event: RealtimeEvent) => void): (() => void) => {
  emitter.on('event', handler)
  return () => emitter.off('event', handler)
}

