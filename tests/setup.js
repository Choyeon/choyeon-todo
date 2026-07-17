import { createPinia } from 'pinia'
import { setActivePinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})
