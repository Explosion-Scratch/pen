let count: number = 0

const countEl = document.getElementById('count') as HTMLSpanElement
const btn = document.getElementById('btn') as HTMLButtonElement

btn.addEventListener('click', (): void => {
  count++
  countEl.textContent = String(count)
})
