import { ref, computed } from 'vue'

const COLLAPSE_THRESHOLD = 7
const MIN_SIZE = 5

/**
 * @typedef {Object} PaneState
 * @property {number} min
 * @property {number} max
 * @property {number} size
 */

/**
 * Creates a composable that manages editor pane sizes.
 * Sizes always sum to 100. Collapsed state is computed from size < threshold.
 * @returns {Object}
 */
export function usePanesManager() {
  const panes = ref([])
  const maximizedIdx = ref(null)
  const savedSizes = ref([])

  const collapsed = computed(() =>
    panes.value.map(p => p.size < COLLAPSE_THRESHOLD)
  )

  function makePane(size) {
    return { min: MIN_SIZE, max: 100, size }
  }

  /**
   * @param {number[]} sizes
   * @returns {number[]}
   */
  function normalize(sizes) {
    const total = sizes.reduce((a, b) => a + b, 0)
    if (total === 0) return sizes.map(() => 100 / sizes.length)
    return sizes.map(s => (s / total) * 100)
  }

  /**
   * @param {number} count
   */
  function init(count) {
    if (count <= 0) return
    maximizedIdx.value = null
    const size = 100 / count
    panes.value = Array.from({ length: count }, () => makePane(size))
    savedSizes.value = panes.value.map(p => p.size)
  }

  /**
   * @param {{ size: number }[]} splitPanes
   */
  function updateFromSplitpanes(splitPanes) {
    if (!splitPanes?.length) return
    const sizes = normalize(splitPanes.map(p => p.size))

    if (maximizedIdx.value !== null) {
      const maxI = maximizedIdx.value
      const stillMaximized = sizes[maxI] > 95 && sizes.every((s, i) => i === maxI || s < 5)
      if (!stillMaximized) {
        maximizedIdx.value = null
      }
    }

    if (panes.value.length !== sizes.length) {
      panes.value = sizes.map(s => makePane(s))
    } else {
      sizes.forEach((s, i) => {
        panes.value[i].size = s
      })
    }
    savedSizes.value = sizes.map(s => s)
  }

  /**
   * @param {number} idx
   * @param {number} newSize
   */
  function wasResized(idx, newSize) {
    if (idx < 0 || idx >= panes.value.length) return
    const count = panes.value.length
    if (count <= 1) return

    const oldSize = panes.value[idx].size
    const delta = newSize - oldSize
    if (Math.abs(delta) < 0.01) return

    panes.value[idx].size = newSize

    const otherIndices = []
    let otherTotal = 0
    for (let i = 0; i < count; i++) {
      if (i !== idx) {
        otherIndices.push(i)
        otherTotal += panes.value[i].size
      }
    }

    if (otherTotal === 0) {
      const share = (100 - newSize) / otherIndices.length
      otherIndices.forEach(i => { panes.value[i].size = share })
    } else {
      const newOtherTotal = 100 - newSize
      const scale = newOtherTotal / otherTotal
      otherIndices.forEach(i => {
        panes.value[i].size = panes.value[i].size * scale
      })
    }

    savedSizes.value = panes.value.map(p => p.size)
  }

  /**
   * @param {number} idx
   */
  function setCollapsed(idx) {
    if (idx < 0 || idx >= panes.value.length) return
    const count = panes.value.length
    if (count <= 1) return

    if (maximizedIdx.value !== null) {
      setMaximized(maximizedIdx.value)
      return
    }

    const isCurrentlyCollapsed = panes.value[idx].size < COLLAPSE_THRESHOLD

    if (isCurrentlyCollapsed) {
      const restoreSize = savedSizes.value[idx] || (100 / count)
      const targetSize = Math.max(restoreSize, COLLAPSE_THRESHOLD + 1)

      const expandableIndices = []
      let expandableTotal = 0
      for (let i = 0; i < count; i++) {
        if (i !== idx) {
          expandableIndices.push(i)
          expandableTotal += panes.value[i].size
        }
      }

      const needed = targetSize - panes.value[idx].size
      if (expandableTotal > 0) {
        const scale = (expandableTotal - needed) / expandableTotal
        expandableIndices.forEach(i => {
          panes.value[i].size = Math.max(0, panes.value[i].size * scale)
        })
      }

      panes.value[idx].size = targetSize

      const sizes = normalize(panes.value.map(p => p.size))
      sizes.forEach((s, i) => { panes.value[i].size = s })
    } else {
      savedSizes.value[idx] = panes.value[idx].size

      const freed = panes.value[idx].size - MIN_SIZE
      panes.value[idx].size = MIN_SIZE

      const expandableIndices = []
      let expandableTotal = 0
      for (let i = 0; i < count; i++) {
        if (i !== idx) {
          expandableIndices.push(i)
          expandableTotal += panes.value[i].size
        }
      }

      if (expandableTotal > 0) {
        expandableIndices.forEach(i => {
          panes.value[i].size += freed * (panes.value[i].size / expandableTotal)
        })
      } else {
        const share = freed / expandableIndices.length
        expandableIndices.forEach(i => { panes.value[i].size += share })
      }
    }
  }

  /**
   * @param {number} idx
   */
  function setMaximized(idx) {
    if (idx < 0 || idx >= panes.value.length) return
    const count = panes.value.length
    if (count <= 1) return

    if (maximizedIdx.value === idx) {
      maximizedIdx.value = null
      const sizes = savedSizes.value.length === count
        ? savedSizes.value.map(s => s)
        : Array.from({ length: count }, () => 100 / count)
      const normalized = normalize(sizes)
      normalized.forEach((s, i) => { panes.value[i].size = s })
      return
    }

    savedSizes.value = panes.value.map(p => p.size)
    maximizedIdx.value = idx

    panes.value.forEach((p, i) => {
      p.size = i === idx ? 100 : 0
    })
  }

  /**
   * @param {number} idx
   * @returns {number}
   */
  function getSize(idx) {
    if (maximizedIdx.value !== null) {
      return idx === maximizedIdx.value ? 100 : 0
    }
    return panes.value[idx]?.size ?? 0
  }

  /**
   * @param {number} idx
   * @returns {number}
   */
  function getMinSize(idx) {
    if (maximizedIdx.value !== null) return 0
    return panes.value[idx]?.min ?? MIN_SIZE
  }

  /**
   * @param {number} idx
   * @returns {boolean}
   */
  function isCollapsed(idx) {
    if (maximizedIdx.value !== null) return idx !== maximizedIdx.value
    return collapsed.value[idx] ?? false
  }

  return {
    panes,
    maximizedIdx,
    collapsed,
    init,
    updateFromSplitpanes,
    wasResized,
    setCollapsed,
    setMaximized,
    getSize,
    getMinSize,
    isCollapsed,
    COLLAPSE_THRESHOLD,
    MIN_SIZE,
  }
}
