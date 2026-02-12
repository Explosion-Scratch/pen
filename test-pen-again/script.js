const { createApp, ref } = Vue

createApp({
  setup() {
    const queryparams = Object.fromEntries(Object.entries(new URLSearchParams(location.search)));

    return {qp: queryparams}
  }
}).mount('#app')
