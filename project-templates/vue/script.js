const { createApp, ref } = Vue

createApp({
  setup() {
    const message = ref('Hello Vue 3!')
    const count = ref(0)
    return { message, count }
  }
}).mount('#app')
