import { createApp, ref } from 'vue';

createApp({
  setup() {
    const message = ref('Hello Vue 3!');
    const count = ref(0);
    return { message, count };
  }
}).mount('#app');
