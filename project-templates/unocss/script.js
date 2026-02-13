import {
  defineConfig,
  presetAttributify,
  presetIcons,
} from 'https://esm.sh/unocss'
import presetWind4 from 'https://esm.sh/@unocss/preset-wind4'

window.__unocss = defineConfig({
  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
    }),
  ],
})
