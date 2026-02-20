import { ref, reactive, watch } from 'vue'
import { fileSystem } from '../filesystem.js'

/**
 * @typedef {Object} EditorDef
 * @property {string} id
 * @property {string} name
 * @property {string} command
 * @property {function(boolean): string} icon
 */

const EDITORS = [
  {
    id: 'vscode',
    name: 'VS Code',
    command: 'code',
    icon: (isDark) => isDark
      ? `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0)">
<g filter="url(#filter0_d)">
<mask id="mask0" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
<path fill-rule="evenodd" clip-rule="evenodd" d="M70.9119 99.5723C72.4869 100.189 74.2828 100.15 75.8725 99.3807L96.4604 89.4231C98.624 88.3771 100 86.1762 100 83.7616V16.2392C100 13.8247 98.624 11.6238 96.4604 10.5774L75.8725 0.619067C73.7862 -0.389991 71.3446 -0.142885 69.5135 1.19527C69.252 1.38636 69.0028 1.59985 68.769 1.83502L29.3551 37.9795L12.1872 24.88C10.5891 23.6607 8.35365 23.7606 6.86938 25.1178L1.36302 30.1525C-0.452603 31.8127 -0.454583 34.6837 1.35854 36.3466L16.2471 50.0001L1.35854 63.6536C-0.454583 65.3164 -0.452603 68.1876 1.36302 69.8477L6.86938 74.8824C8.35365 76.2395 10.5891 76.34 12.1872 75.1201L29.3551 62.0207L68.769 98.1651C69.3925 98.7923 70.1246 99.2645 70.9119 99.5723ZM75.0152 27.1813L45.1092 50.0001L75.0152 72.8189V27.1813Z" fill="white"/>
</mask>
<g mask="url(#mask0)">
<path d="M96.4614 10.593L75.8567 0.62085C73.4717 -0.533437 70.6215 -0.0465506 68.7498 1.83492L1.29834 63.6535C-0.515935 65.3164 -0.513852 68.1875 1.30281 69.8476L6.8125 74.8823C8.29771 76.2395 10.5345 76.339 12.1335 75.1201L93.3604 13.18C96.0854 11.102 100 13.0557 100 16.4939V16.2535C100 13.84 98.6239 11.64 96.4614 10.593Z" fill="#D9D9D9"/>
<g filter="url(#filter1_d)">
<path d="M96.4614 89.4074L75.8567 99.3797C73.4717 100.534 70.6215 100.047 68.7498 98.1651L1.29834 36.3464C-0.515935 34.6837 -0.513852 31.8125 1.30281 30.1524L6.8125 25.1177C8.29771 23.7605 10.5345 23.6606 12.1335 24.88L93.3604 86.8201C96.0854 88.8985 100 86.9447 100 83.5061V83.747C100 86.1604 98.6239 88.3603 96.4614 89.4074Z" fill="#E6E6E6"/>
</g>
<g filter="url(#filter2_d)">
<path d="M75.8578 99.3807C73.4721 100.535 70.6219 100.047 68.75 98.1651C71.0564 100.483 75 98.8415 75 95.5631V4.43709C75 1.15852 71.0565 -0.483493 68.75 1.83492C70.6219 -0.0467614 73.4721 -0.534276 75.8578 0.618963L96.4583 10.5773C98.6229 11.6237 100 13.8246 100 16.2391V83.7616C100 86.1762 98.6229 88.3761 96.4583 89.4231L75.8578 99.3807Z" fill="white"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.25">
<path style="mix-blend-mode:overlay" opacity="0.25" fill-rule="evenodd" clip-rule="evenodd" d="M70.8508 99.5723C72.4258 100.189 74.2218 100.15 75.8115 99.3807L96.4 89.4231C98.5635 88.3771 99.9386 86.1762 99.9386 83.7616V16.2391C99.9386 13.8247 98.5635 11.6239 96.4 10.5774L75.8115 0.618974C73.7252 -0.390085 71.2835 -0.142871 69.4525 1.19518C69.1909 1.38637 68.9418 1.59976 68.7079 1.83493L29.2941 37.9795L12.1261 24.88C10.528 23.6606 8.2926 23.7605 6.80833 25.1177L1.30198 30.1524C-0.51354 31.8126 -0.515625 34.6837 1.2975 36.3465L16.186 50L1.2975 63.6536C-0.515625 65.3164 -0.51354 68.1875 1.30198 69.8476L6.80833 74.8824C8.2926 76.2395 10.528 76.339 12.1261 75.1201L29.2941 62.0207L68.7079 98.1651C69.3315 98.7923 70.0635 99.2645 70.8508 99.5723ZM74.9542 27.1812L45.0481 50L74.9542 72.8188V27.1812Z" fill="url(#paint0_linear)"/>
</g>
</g>
</g>
</g>
<defs>
<filter id="filter0_d" x="-6.25" y="-4.16667" width="112.5" height="112.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
<feOffset dy="2.08333"/>
<feGaussianBlur stdDeviation="3.125"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
</filter>
<filter id="filter1_d" x="-8.39436" y="15.6951" width="116.728" height="92.6376" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
<feOffset/>
<feGaussianBlur stdDeviation="4.16667"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="overlay" in2="BackgroundImageFix" result="effect1_dropShadow"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
</filter>
<filter id="filter2_d" x="60.4167" y="-8.33346" width="47.9167" height="116.667" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
<feOffset/>
<feGaussianBlur stdDeviation="4.16667"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="overlay" in2="BackgroundImageFix" result="effect1_dropShadow"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
</filter>
<linearGradient id="paint0_linear" x1="49.939" y1="-5.19792e-05" x2="49.939" y2="100.001" gradientUnits="userSpaceOnUse">
<stop stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0"/>
</linearGradient>
<clipPath id="clip0">
<rect width="100" height="100" fill="white"/>
</clipPath>
</defs>
</svg>
`
      : `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="mask0" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
<path fill-rule="evenodd" clip-rule="evenodd" d="M70.9119 99.3171C72.4869 99.9307 74.2828 99.8914 75.8725 99.1264L96.4608 89.2197C98.6242 88.1787 100 85.9892 100 83.5872V16.4133C100 14.0113 98.6243 11.8218 96.4609 10.7808L75.8725 0.873756C73.7862 -0.130129 71.3446 0.11576 69.5135 1.44695C69.252 1.63711 69.0028 1.84943 68.769 2.08341L29.3551 38.0415L12.1872 25.0096C10.589 23.7965 8.35363 23.8959 6.86933 25.2461L1.36303 30.2549C-0.452552 31.9064 -0.454633 34.7627 1.35853 36.417L16.2471 50.0001L1.35853 63.5832C-0.454633 65.2374 -0.452552 68.0938 1.36303 69.7453L6.86933 74.7541C8.35363 76.1043 10.589 76.2037 12.1872 74.9905L29.3551 61.9587L68.769 97.9167C69.3925 98.5406 70.1246 99.0104 70.9119 99.3171ZM75.0152 27.2989L45.1091 50.0001L75.0152 72.7012V27.2989Z" fill="white"/>
</mask>
<g mask="url(#mask0)">
<path d="M96.4614 10.7962L75.8569 0.875542C73.4719 -0.272773 70.6217 0.211611 68.75 2.08333L1.29858 63.5832C-0.515693 65.2373 -0.513607 68.0937 1.30308 69.7452L6.81272 74.754C8.29793 76.1042 10.5347 76.2036 12.1338 74.9905L93.3609 13.3699C96.086 11.3026 100 13.2462 100 16.6667V16.4275C100 14.0265 98.6246 11.8378 96.4614 10.7962Z" fill="#0065A9"/>
<g filter="url(#filter0_d)">
<path d="M96.4614 89.2038L75.8569 99.1245C73.4719 100.273 70.6217 99.7884 68.75 97.9167L1.29858 36.4169C-0.515693 34.7627 -0.513607 31.9063 1.30308 30.2548L6.81272 25.246C8.29793 23.8958 10.5347 23.7964 12.1338 25.0095L93.3609 86.6301C96.086 88.6974 100 86.7538 100 83.3334V83.5726C100 85.9735 98.6246 88.1622 96.4614 89.2038Z" fill="#007ACC"/>
</g>
<g filter="url(#filter1_d)">
<path d="M75.8578 99.1263C73.4721 100.274 70.6219 99.7885 68.75 97.9166C71.0564 100.223 75 98.5895 75 95.3278V4.67213C75 1.41039 71.0564 -0.223106 68.75 2.08329C70.6219 0.211402 73.4721 -0.273666 75.8578 0.873633L96.4587 10.7807C98.6234 11.8217 100 14.0112 100 16.4132V83.5871C100 85.9891 98.6234 88.1786 96.4586 89.2196L75.8578 99.1263Z" fill="#1F9CF0"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.25">
<path fill-rule="evenodd" clip-rule="evenodd" d="M70.8511 99.3171C72.4261 99.9306 74.2221 99.8913 75.8117 99.1264L96.4 89.2197C98.5634 88.1787 99.9392 85.9892 99.9392 83.5871V16.4133C99.9392 14.0112 98.5635 11.8217 96.4001 10.7807L75.8117 0.873695C73.7255 -0.13019 71.2838 0.115699 69.4527 1.44688C69.1912 1.63705 68.942 1.84937 68.7082 2.08335L29.2943 38.0414L12.1264 25.0096C10.5283 23.7964 8.29285 23.8959 6.80855 25.246L1.30225 30.2548C-0.513334 31.9064 -0.515415 34.7627 1.29775 36.4169L16.1863 50L1.29775 63.5832C-0.515415 65.2374 -0.513334 68.0937 1.30225 69.7452L6.80855 74.754C8.29285 76.1042 10.5283 76.2036 12.1264 74.9905L29.2943 61.9586L68.7082 97.9167C69.3317 98.5405 70.0638 99.0104 70.8511 99.3171ZM74.9544 27.2989L45.0483 50L74.9544 72.7012V27.2989Z" fill="url(#paint0_linear)"/>
</g>
</g>
<defs>
<filter id="filter0_d" x="-8.39411" y="15.8291" width="116.727" height="92.2456" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
<feOffset/>
<feGaussianBlur stdDeviation="4.16667"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="overlay" in2="BackgroundImageFix" result="effect1_dropShadow"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
</filter>
<filter id="filter1_d" x="60.4167" y="-8.07558" width="47.9167" height="116.151" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
<feOffset/>
<feGaussianBlur stdDeviation="4.16667"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="overlay" in2="BackgroundImageFix" result="effect1_dropShadow"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
</filter>
<linearGradient id="paint0_linear" x1="49.9392" y1="0.257812" x2="49.9392" y2="99.7423" gradientUnits="userSpaceOnUse">
<stop stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0"/>
</linearGradient>
</defs>
</svg>
`,
  },
  {
    id: 'vscode-insiders',
    name: 'VS Code Insiders',
    command: 'code-insiders',
    icon: () => `<?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg width="800px" height="800px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><title>file_type_vscode-insiders</title><path d="M20.375,3.291a.874.874,0,0,1,1.463.647V10.25l-8.36,6.624L9.172,13.608Z" style="fill:#009a7c"/><path d="M6.013,16.669,2.38,19.8A1.166,1.166,0,0,0,2.3,21.447c.025.027.05.053.077.077l1.541,1.4a1.166,1.166,0,0,0,1.489.066L9.6,19.935Z" style="fill:#009a7c"/><path d="M21.838,21.749,5.412,9.007a1.165,1.165,0,0,0-1.489.066l-1.541,1.4a1.166,1.166,0,0,0-.077,1.647c.025.027.05.053.077.077l17.99,16.5a.875.875,0,0,0,1.466-.645Z" style="fill:#00b294"/><path d="M23.244,29.747a1.745,1.745,0,0,1-1.989-.338A1.025,1.025,0,0,0,23,28.684V3.316a1.025,1.025,0,0,0-1.749-.725,1.745,1.745,0,0,1,1.989-.338l5.765,2.772A1.748,1.748,0,0,1,30,6.6V25.4a1.748,1.748,0,0,1-.991,1.576Z" style="fill:#24bfa5"/></svg>`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    command: 'cursor',
    icon: (isDark) => isDark
      ? `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Ebene_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 466.73 532.09">
  <!-- Generator: Adobe Illustrator 29.6.1, SVG Export Plug-In . SVG Version: 2.1.1 Build 9)  -->
  <defs>
    <style>
      .st0 {
        fill: #edecec;
      }
    </style>
  </defs>
  <path class="st0" d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"/>
</svg>`
      : `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Ebene_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 466.73 532.09">
  <!-- Generator: Adobe Illustrator 29.6.1, SVG Export Plug-In . SVG Version: 2.1.1 Build 9)  -->
  <defs>
    <style>
      .st0 {
        fill: #26251e;
      }
    </style>
  </defs>
  <path class="st0" d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"/>
</svg>`,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    command: 'windsurf',
    icon: (isDark) => isDark
      ? `<svg width="779" height="453" viewBox="125 284 779 453" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M897.246 286.869H889.819C850.735 286.808 819.017 318.46 819.017 357.539V515.589C819.017 547.15 792.93 572.716 761.882 572.716C743.436 572.716 725.02 563.433 714.093 547.85L552.673 317.304C539.28 298.16 517.486 286.747 493.895 286.747C457.094 286.747 423.976 318.034 423.976 356.657V515.619C423.976 547.181 398.103 572.746 366.842 572.746C348.335 572.746 329.949 563.463 319.021 547.881L138.395 289.882C134.316 284.038 125.154 286.93 125.154 294.052V431.892C125.154 438.862 127.285 445.619 131.272 451.34L309.037 705.2C319.539 720.204 335.033 731.344 352.9 735.392C397.616 745.557 438.77 711.135 438.77 667.278V508.406C438.77 476.845 464.339 451.279 495.904 451.279H495.995C515.02 451.279 532.857 460.562 543.785 476.145L705.235 706.661C718.659 725.835 739.327 737.218 763.983 737.218C801.606 737.218 833.841 705.9 833.841 667.308V508.376C833.841 476.815 859.41 451.249 890.975 451.249H897.276C901.233 451.249 904.43 448.053 904.43 444.097V294.021C904.43 290.065 901.233 286.869 897.276 286.869H897.246Z" fill="white"/>
</svg>
`
      : `<svg width="779" height="453" viewBox="125 284 779 453" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M897.246 286.869H889.819C850.735 286.808 819.017 318.46 819.017 357.539V515.589C819.017 547.15 792.93 572.716 761.882 572.716C743.436 572.716 725.02 563.433 714.093 547.85L552.673 317.304C539.28 298.16 517.486 286.747 493.895 286.747C457.094 286.747 423.976 318.034 423.976 356.657V515.619C423.976 547.181 398.103 572.746 366.842 572.746C348.335 572.746 329.949 563.463 319.021 547.881L138.395 289.882C134.316 284.038 125.154 286.93 125.154 294.052V431.892C125.154 438.862 127.285 445.619 131.272 451.34L309.037 705.2C319.539 720.204 335.033 731.344 352.9 735.392C397.616 745.557 438.77 711.135 438.77 667.278V508.406C438.77 476.845 464.339 451.279 495.904 451.279H495.995C515.02 451.279 532.857 460.562 543.785 476.145L705.235 706.661C718.659 725.835 739.327 737.218 763.983 737.218C801.606 737.218 833.841 705.9 833.841 667.308V508.376C833.841 476.815 859.41 451.249 890.975 451.249H897.276C901.233 451.249 904.43 448.053 904.43 444.097V294.021C904.43 290.065 901.233 286.869 897.276 286.869H897.246Z" fill="#0B100F"/>
</svg>
`,
  },
  {
    id: 'zed',
    name: 'Zed',
    command: 'zed',
    icon: (isDark) => isDark
      ? `<svg width="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.4375 5.625C6.8842 5.625 5.625 6.8842 5.625 8.4375V70.3125H0V8.4375C0 3.7776 3.7776 0 8.4375 0H83.7925C87.551 0 89.4333 4.5442 86.7756 7.20186L40.3642 53.6133H53.4375V47.8125H59.0625V55.0195C59.0625 57.3495 57.1737 59.2383 54.8438 59.2383H34.7392L25.0712 68.9062H68.9062V33.75H74.5312V68.9062C74.5312 72.0128 72.0128 74.5312 68.9062 74.5312H19.4462L9.60248 84.375H81.5625C83.1158 84.375 84.375 83.1158 84.375 81.5625V19.6875H90V81.5625C90 86.2224 86.2224 90 81.5625 90H6.20749C2.44898 90 0.566723 85.4558 3.22438 82.7981L49.46 36.5625H36.5625V42.1875H30.9375V35.1562C30.9375 32.8263 32.8263 30.9375 35.1562 30.9375H55.085L64.9288 21.0938H21.0938V56.25H15.4688V21.0938C15.4688 17.9871 17.9871 15.4688 21.0938 15.4688H70.5538L80.3975 5.625H8.4375Z" fill="white"/>
</svg>
`
      : `<svg width="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.4375 5.625C6.8842 5.625 5.625 6.8842 5.625 8.4375V70.3125H0V8.4375C0 3.7776 3.7776 0 8.4375 0H83.7925C87.551 0 89.4333 4.5442 86.7756 7.20186L40.3642 53.6133H53.4375V47.8125H59.0625V55.0195C59.0625 57.3495 57.1737 59.2383 54.8438 59.2383H34.7392L25.0712 68.9062H68.9062V33.75H74.5312V68.9062C74.5312 72.0128 72.0128 74.5312 68.9062 74.5312H19.4462L9.60248 84.375H81.5625C83.1158 84.375 84.375 83.1158 84.375 81.5625V19.6875H90V81.5625C90 86.2224 86.2224 90 81.5625 90H6.20749C2.44898 90 0.566723 85.4558 3.22438 82.7981L49.46 36.5625H36.5625V42.1875H30.9375V35.1562C30.9375 32.8263 32.8263 30.9375 35.1562 30.9375H55.085L64.9288 21.0938H21.0938V56.25H15.4688V21.0938C15.4688 17.9871 17.9871 15.4688 21.0938 15.4688H70.5538L80.3975 5.625H8.4375Z" fill="black"/>
</svg>
`,
  },
  {
    id: 'intellij',
    name: 'IntelliJ IDEA',
    command: 'idea',
    icon: () => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="a" x1="-.717383" x2="24.1455" y1="7.61946" y2="61.2456" gradientUnits="userSpaceOnUse">
      <stop offset=".1" stop-color="#FC801D"/>
      <stop offset=".59" stop-color="#FE2857"/>
    </linearGradient>
    <linearGradient id="b" x1="4.22243" x2="62.9273" y1="60.0186" y2="1.31316" gradientUnits="userSpaceOnUse">
      <stop offset=".21" stop-color="#FE2857"/>
      <stop offset=".7" stop-color="#007EFF"/>
    </linearGradient>
  </defs>
  <path fill="#FF8100" d="m15.9476 5.81641-11.87545.00174C1.82284 5.81815 0 7.64157 0 9.89088V21.3975c0 1.1887.519564 2.3185 1.42196 3.0924L39.5828 57.1997c.7384.6324 1.6786.9803 2.6508.9803h11.8755c2.2493 0 4.0727-1.8234 4.0727-4.0727V42.599c0-1.1887-.5195-2.3186-1.4219-3.0924L18.599 6.79735c-.7383-.63302-1.6786-.98036-2.6514-.98036v-.00058Z"/>
  <path fill="url(#a)" d="M14.5193 5.81641H4.07273C1.82342 5.81641 0 7.63982 0 9.88913V22.9818c0 .1926.013964.3852.040727.576L5.31782 60.5015c.28683 2.0067 2.00494 3.4967 4.032 3.4967H25.0228c2.2499 0 4.0733-1.824 4.0728-4.0739l-.0047-18.5384c0-.4376-.0704-.8722-.2089-1.287L18.3825 8.60099c-.5544-1.66284-2.1108-2.78458-3.8638-2.78458h.0006Z"/>
  <path fill="url(#b)" d="M59.9275 0H25.9592c-1.6291 0-3.1017.971054-3.7435 2.46807L6.14767 39.9587c-.21702.5068-.32931 1.0531-.32931 1.6046v18.364C5.81836 62.1766 7.64178 64 9.89109 64H27.8571c.8046 0 1.5912-.2385 2.2609-.6854l32.0687-21.4033c1.1322-.7552 1.8117-2.0265 1.8117-3.3874l.0018-34.45117C64.0002 1.82342 62.1768 0 59.9275 0Z"/>
  <path fill="#000" d="M52 12H12v40h40V12Z"/>
  <path fill="#fff" d="M17 29.3856h2.9788v-9.7712H17V17h8.839v2.6144h-2.9788v9.7712h2.9788V32H17v-2.6144Z"/>
  <path fill="#fff" d="M27.3389 29.3002h2.1538c.4354 0 .8233-.0928 1.1625-.2784.3392-.1857.6016-.4481.7872-.7873.1857-.3392.2785-.7265.2785-1.1625V17h2.9249v10.2748c0 .9001-.2074 1.7092-.6216 2.4271-.4143.7179-.9855 1.2805-1.7143 1.6873-.7288.4074-1.5464.6108-2.4534.6108h-2.5176v-2.6998Z"/>
  <path fill="#fff" d="M17 44h16v3H17v-3Z"/>
</svg>
`,
  },
  {
    id: 'xcode',
    name: 'Xcode',
    command: 'xed',
    icon: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><linearGradient id="xcode-original-a" gradientUnits="userSpaceOnUse" x1="63.947" y1="114.165" x2="63.947" y2="13.784"><stop offset="0" stop-color="#1578e4"/><stop offset="1" stop-color="#00c3f2"/></linearGradient><path d="M35.7 13.8h56.5c12.1 0 21.9 9.8 21.9 21.9v56.5c0 12.1-9.8 21.9-21.9 21.9H35.7c-12.1 0-21.9-9.8-21.9-21.9V35.7c0-12.1 9.8-21.9 21.9-21.9z" fill="url(#xcode-original-a)"/><path fill="#FFF" d="M90.5 19.2H37.4c-10.1 0-18.3 8.2-18.3 18.3v53.1c0 10.1 8.2 18.3 18.3 18.3h53.1c10.1 0 18.3-8.2 18.3-18.3V37.4c0-10.1-8.2-18.2-18.3-18.2zm16.8 71.6c0 9.2-7.4 16.6-16.6 16.6H37.2c-9.1 0-16.6-7.4-16.6-16.6V37.2c0-9.2 7.4-16.6 16.6-16.6h53.6c9.1 0 16.6 7.4 16.6 16.6v53.6z"/><path d="M64.1 22.8c-22.6 0-41 18.4-41 41s18.4 41 41 41c22.7 0 41-18.4 41-41s-18.4-41-41-41zm0 81.4c-22.3 0-40.4-18.1-40.4-40.4s18.1-40.4 40.4-40.4c22.3 0 40.4 18.1 40.4 40.4s-18.1 40.4-40.4 40.4z" fill="#69c5f3"/><path d="M64.1 31.2c-18.1 0-32.7 14.6-32.7 32.7S46 96.5 64.1 96.5s32.7-14.6 32.7-32.7-14.7-32.6-32.7-32.6zm0 64.6c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.4 32-32 32z" fill="#68c5f4"/><path fill="#FFF" d="M32.8 71.3h62.4c2.6 0 4.6 2.1 4.6 4.6 0 2.6-2.1 4.6-4.6 4.6H32.8c-2.6 0-4.6-2.1-4.6-4.6-.1-2.5 2-4.6 4.6-4.6z"/><path d="M32.6 72.2h62.6c2 0 3.7 1.6 3.7 3.7v.1c0 2-1.6 3.7-3.7 3.7H32.6c-2 0-3.7-1.6-3.7-3.7v-.2c.1-2 1.7-3.6 3.7-3.6z" fill="#0a93e9"/><path d="M31.1 79.3h65.7l.5-.3H30.6l.5.3z" fill="#1694ea"/><path d="M29.6 78.1h68.6l.2-.3h-69l.2.3z" fill="#319dec"/><path d="M29 76.2h69.9v-.4H29v.4z" fill="#65b1ee"/><path d="M29.7 73.7h68.6l.1.2.1.2h-69l.1-.2.1-.2z" fill="#8ec6f3"/><path d="M31.2 72.5h65.6l.3.1.3.2H30.6l.3-.2.3-.1z" fill="#95caf3"/><linearGradient id="xcode-original-b" gradientUnits="userSpaceOnUse" x1="94.037" y1="79.666" x2="94.037" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M93.4 72.2h-.5s1.7 1.2 1.7 3.9c0 2.5-1.7 3.6-1.7 3.6h.5s1.7-.8 1.7-3.6c0-3-1.7-3.9-1.7-3.9z" fill="url(#xcode-original-b)"/><linearGradient id="xcode-original-c" gradientUnits="userSpaceOnUse" x1="89.042" y1="79.666" x2="89.042" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M88.6 72.2h-.5s1.5 1.4 1.5 3.9c0 2.2-1.5 3.6-1.5 3.6h.5s1.5-1.1 1.5-3.6c-.1-2.7-1.5-3.9-1.5-3.9z" fill="url(#xcode-original-c)"/><linearGradient id="xcode-original-d" gradientUnits="userSpaceOnUse" x1="63.947" y1="79.666" x2="63.947" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M63.7 72.2h.5v7.5h-.5v-7.5z" fill="url(#xcode-original-d)"/><linearGradient id="xcode-original-e" gradientUnits="userSpaceOnUse" x1="58.952" y1="79.666" x2="58.952" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M58.8 72.2h.5s-.2 1.9-.2 3.9c0 1.8.2 3.6.2 3.6h-.5s-.2-1.8-.2-3.6c0-2 .2-3.9.2-3.9z" fill="url(#xcode-original-e)"/><linearGradient id="xcode-original-f" gradientUnits="userSpaceOnUse" x1="53.958" y1="79.666" x2="53.958" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M54 72.2h.5s-.5 1.9-.5 3.9c0 1.8.5 3.6.5 3.6H54s-.5-1.8-.5-3.6c0-2 .5-3.9.5-3.9z" fill="url(#xcode-original-f)"/><linearGradient id="xcode-original-g" gradientUnits="userSpaceOnUse" x1="48.963" y1="79.666" x2="48.963" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M49.1 72.2h.5s-.7 1.9-.7 3.9c0 1.8.7 3.6.7 3.6h-.5s-.7-1.8-.7-3.6c0-2 .7-3.9.7-3.9z" fill="url(#xcode-original-g)"/><linearGradient id="xcode-original-h" gradientUnits="userSpaceOnUse" x1="43.968" y1="79.666" x2="43.968" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M44.2 72.2h.5s-1 1.6-1 3.9c0 2 1 3.6 1 3.6h-.5s-1-1.6-1-3.6c0-2.3 1-3.9 1-3.9z" fill="url(#xcode-original-h)"/><linearGradient id="xcode-original-i" gradientUnits="userSpaceOnUse" x1="38.852" y1="79.666" x2="38.852" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M39.3 72.2h.5s-1.5 1.4-1.5 3.9c0 2.2 1.5 3.6 1.5 3.6h-.5s-1.5-1.1-1.5-3.6c.1-2.7 1.5-3.9 1.5-3.9z" fill="url(#xcode-original-i)"/><linearGradient id="xcode-original-j" gradientUnits="userSpaceOnUse" x1="33.857" y1="79.666" x2="33.857" y2="72.184"><stop offset="0" stop-color="#1492e7"/><stop offset="1" stop-color="#dbedfb"/></linearGradient><path d="M34.5 72.2h.5s-1.7 1.2-1.7 3.9c0 2.5 1.7 3.6 1.7 3.6h-.5s-1.7-.8-1.7-3.6c0-3 1.7-3.9 1.7-3.9z" fill="url(#xcode-original-j)"/><path fill="#FFF" d="M62 34.1l31.2 54c1.3 2.2.5 5-1.7 6.3-2.2 1.3-5 .5-6.3-1.7L54 38.7c-1.3-2.2-.5-5 1.7-6.3 2.2-1.3 5-.5 6.3 1.7z"/><linearGradient id="xcode-original-k" gradientUnits="userSpaceOnUse" x1="73.58" y1="94.25" x2="73.58" y2="32.642"><stop offset="0" stop-color="#1285e7"/><stop offset="1" stop-color="#00b5ef"/></linearGradient><path d="M61.2 34.5l31.3 54.2c1 1.7.4 4-1.3 5l-.2.1c-1.7 1-4 .4-5-1.3L54.7 38.2c-1-1.7-.4-4 1.3-5l.1-.1c1.8-1 4.1-.4 5.1 1.4z" fill="url(#xcode-original-k)"/><linearGradient id="xcode-original-l" gradientUnits="userSpaceOnUse" x1="87.464" y1="93.978" x2="54.081" y2="36.156"><stop offset="0" stop-color="#2b90e7"/><stop offset="1" stop-color="#00b6ef"/></linearGradient><path d="M54.2 36.7L87 93.6l.2.1.2.1.2.1-33.4-57.8v.6z" fill="url(#xcode-original-l)"/><linearGradient id="xcode-original-m" gradientUnits="userSpaceOnUse" x1="89.073" y1="94.327" x2="54.583" y2="34.589"><stop offset="0" stop-color="#3795ea"/><stop offset="1" stop-color="#49c4f2"/></linearGradient><path d="M54.5 34.8l34.3 59.4h.4L54.7 34.5l-.1.2-.1.1z" fill="url(#xcode-original-m)"/><linearGradient id="xcode-original-n" gradientUnits="userSpaceOnUse" x1="91.026" y1="93.735" x2="56.072" y2="33.193"><stop offset="0" stop-color="#3696ea"/><stop offset="1" stop-color="#90d9f6"/></linearGradient><path d="M55.9 33.3l35 60.5.3-.2-35-60.5-.3.2z" fill="url(#xcode-original-n)"/><linearGradient id="xcode-original-o" gradientUnits="userSpaceOnUse" x1="92.582" y1="92.332" x2="58.065" y2="32.547"><stop offset="0" stop-color="#3097ea"/><stop offset="1" stop-color="#b5e5f9"/></linearGradient><path d="M58.4 32.7L92.6 92l-.1.2-.1.2-34.5-59.8h.2l.3.1z" fill="url(#xcode-original-o)"/><linearGradient id="xcode-original-p" gradientUnits="userSpaceOnUse" x1="93.083" y1="90.686" x2="59.741" y2="32.936"><stop offset="0" stop-color="#3a98ea"/><stop offset="1" stop-color="#bce7fa"/></linearGradient><path d="M60.2 33.3L93 90.1v.6L59.6 33l.2.1.2.1.2.1z" fill="url(#xcode-original-p)"/><path fill="#3c98ea" d="M91.5 86.9l-.2-.4s-.2 2-2.4 3.4c-2.1 1.3-4 .4-4 .4l.2.4s1.6 1.1 4-.4c2.4-1.4 2.4-3.4 2.4-3.4zM89 82.7l-.2-.4s-.5 2-2.6 3.2c-1.9 1.2-3.8.6-3.8.6l.2.4s1.7.7 3.9-.6c2.2-1.3 2.5-3.2 2.5-3.2z"/><path d="M86.6 78.5l-.2-.4s-.9 1.7-2.8 2.8c-1.7 1-3.6 1-3.6 1l.2.4s1.8 0 3.6-1c1.9-1.1 2.8-2.8 2.8-2.8z" fill="#4ca4ed"/><path d="M84.2 74.3l-.2-.4s-1.3 1.7-3 2.6c-1.6.9-3.5 1.2-3.5 1.2l.2.4s1.9-.3 3.5-1.2c1.6-.9 3-2.6 3-2.6z" fill="#4da7ee"/><linearGradient id="xcode-original-q" gradientUnits="userSpaceOnUse" x1="67.981" y1="61.226" x2="74.457" y2="57.487"><stop offset="0" stop-color="#00a4ec"/><stop offset="1" stop-color="#b9dff6"/></linearGradient><path d="M74.3 57.3l.2.4s-1.7.8-3.4 1.7c-1.6.9-3 2.1-3 2.1l-.2-.4s1.5-1.2 3-2.1c1.7-.9 3.4-1.7 3.4-1.7z" fill="url(#xcode-original-q)"/><linearGradient id="xcode-original-r" gradientUnits="userSpaceOnUse" x1="65.487" y1="56.906" x2="71.962" y2="53.167"><stop offset="0" stop-color="#00a4ec"/><stop offset="1" stop-color="#b9dff6"/></linearGradient><path d="M71.9 53.1l.2.4s-1.9.6-3.5 1.6c-1.6.9-2.9 2.3-2.9 2.3l-.2-.4s1.3-1.4 2.9-2.3c1.6-1.1 3.5-1.6 3.5-1.6z" fill="url(#xcode-original-r)"/><path d="M67.4 49.8c1.3-.4 2.3-.6 2.3-.6l-.2-.4s-.9.1-1.9.5c-.6.2-.7.7-.2.5z" fill="#9dd4f7"/><linearGradient id="xcode-original-s" gradientUnits="userSpaceOnUse" x1="57.93" y1="43.819" x2="64.364" y2="40.105"><stop offset="0" stop-color="#00b4ef"/><stop offset="1" stop-color="#c3e9fa"/></linearGradient><path d="M64.6 40.5l.2.4s-1.9-.5-4.1.7c-1.9 1.2-2.3 3.1-2.3 3.1l-.2-.4s.2-1.7 2.3-3c2.2-1.4 4.1-.8 4.1-.8z" fill="url(#xcode-original-s)"/><linearGradient id="xcode-original-t" gradientUnits="userSpaceOnUse" x1="55.424" y1="39.477" x2="61.9" y2="35.738"><stop offset="0" stop-color="#00b4ef"/><stop offset="1" stop-color="#c3e9fa"/></linearGradient><path d="M62.2 36.2l.3.4s-2-.8-4.3.5C56 38.5 56 40.4 56 40.4l-.3-.4s-.2-1.7 2.2-3.2c2.5-1.5 4.3-.6 4.3-.6z" fill="url(#xcode-original-t)"/><path fill="#FFF" d="M55.5 71.3c8.7-15 18.7-32.4 18.7-32.4 1.3-2.2.5-5-1.7-6.3-2.2-1.3-5-.5-6.3 1.7 0 0-12.2 21.2-21.4 37h10.7zm-5.4 9.2C45.9 87.7 43 92.9 43 92.9c-1.3 2.2-4.1 3-6.3 1.7s-3-4.1-1.7-6.3c0 0 1.7-3.1 4.4-7.7 3.4-.1 9.6-.1 10.7-.1z"/><linearGradient id="xcode-original-u" gradientUnits="userSpaceOnUse" x1="54.566" y1="94.401" x2="54.566" y2="32.794"><stop offset="0" stop-color="#1285e7"/><stop offset="1" stop-color="#00b5ef"/></linearGradient><path d="M54.4 71.3c8.8-15.2 19-32.9 19-32.9 1-1.7.4-4-1.3-5l-.1-.1c-1.7-1-4-.4-5 1.3 0 0-12 20.8-21.2 36.7h8.6zm-5.3 9.2c-4 7-6.9 12-6.9 12-1 1.7-3.2 2.3-5 1.3H37c-1.7-1-2.3-3.2-1.3-5 0 0 1.9-3.3 4.8-8.3h8.6z" fill="url(#xcode-original-u)"/><linearGradient id="xcode-original-v" gradientUnits="userSpaceOnUse" x1="40.681" y1="94.131" x2="74.064" y2="36.311"><stop offset="0" stop-color="#3194e9"/><stop offset="1" stop-color="#71cff4"/></linearGradient><path d="M54.1 71.3L74 36.9v-.6s-11 19.1-20.2 35h.3zm-5.4 9.2l-7.6 13.2-.3.2-.3.1s3.4-5.9 7.8-13.5h.4z" fill="url(#xcode-original-v)"/><linearGradient id="xcode-original-w" gradientUnits="userSpaceOnUse" x1="39.063" y1="94.482" x2="73.557" y2="34.736"><stop offset="0" stop-color="#5aa6ec"/><stop offset="1" stop-color="#a2def8"/></linearGradient><path d="M52.6 71.3l21-36.3-.1-.2-.1-.2S61.9 54.5 52.3 71.2l.3.1zm-5.3 9.2l-8 13.8h-.4s3.4-5.9 8-13.9c.2.1.4.1.4.1z" fill="url(#xcode-original-w)"/><linearGradient id="xcode-original-x" gradientUnits="userSpaceOnUse" x1="37.118" y1="93.885" x2="72.072" y2="33.343"><stop offset="0" stop-color="#66abee"/><stop offset="1" stop-color="#bee8fa"/></linearGradient><path d="M50.4 71.3c9.9-17.1 21.8-37.8 21.8-37.8l-.3-.2-22 38h.5zM45 80.6C40.6 88.3 37.3 94 37.3 94l-.3-.2s3.2-5.6 7.6-13.2c.2-.1.1-.1.4 0z" fill="url(#xcode-original-x)"/><linearGradient id="xcode-original-y" gradientUnits="userSpaceOnUse" x1="35.568" y1="92.482" x2="70.085" y2="32.697"><stop offset="0" stop-color="#7bb6f0"/><stop offset="1" stop-color="#b1e3f9"/></linearGradient><path d="M48 71.3c9.9-17.1 22.2-38.5 22.2-38.5h-.4S57.5 54.1 47.6 71.3h.4zm-5.8 9.2c-4 6.9-6.7 11.6-6.7 11.6l.1.2.1.2s2.9-5 7-12h-.5z" fill="url(#xcode-original-y)"/><linearGradient id="xcode-original-z" gradientUnits="userSpaceOnUse" x1="35.056" y1="90.872" x2="68.415" y2="33.092"><stop offset="0" stop-color="#5aa6ec"/><stop offset="1" stop-color="#afe3f9"/></linearGradient><path d="M46.5 71.3l22-38.1-.2.1-.2.1-.1.1S55.8 54.6 46.2 71.3h.3zm-5.3 9.2c-3.5 6.1-6 10.4-6 10.4v-.8s2.2-3.8 5.6-9.7c.2.1.2.1.4.1z" fill="url(#xcode-original-z)"/><linearGradient id="xcode-original-A" gradientUnits="userSpaceOnUse" x1="66.362" y1="35.689" x2="72.838" y2="39.428"><stop offset="0" stop-color="#c1e7fa"/><stop offset="1" stop-color="#89d4f5"/></linearGradient><path d="M66 36.2l-.2.4s1.8-.9 4.2.4c2.2 1.2 2.3 3.3 2.3 3.3l.2-.4s.2-1.9-2.3-3.3-4.2-.4-4.2-.4z" fill="url(#xcode-original-A)"/><linearGradient id="xcode-original-B" gradientUnits="userSpaceOnUse" x1="63.856" y1="40.03" x2="70.332" y2="43.768"><stop offset="0" stop-color="#c1e7fa"/><stop offset="1" stop-color="#89d4f5"/></linearGradient><path d="M63.6 40.5l-.2.4s2-.6 4.1.6c2 1.1 2.4 3 2.4 3l.2-.4s-.2-1.8-2.4-3c-2.3-1.3-4.1-.6-4.1-.6z" fill="url(#xcode-original-B)"/><linearGradient id="xcode-original-C" gradientUnits="userSpaceOnUse" x1="61.273" y1="44.505" x2="67.748" y2="48.243"><stop offset="0" stop-color="#c1e7fa"/><stop offset="1" stop-color="#89d4f5"/></linearGradient><path d="M61.1 44.7l-.2.4s1.8-.1 3.8 1.1c1.8 1 2.7 2.6 2.7 2.6l.2-.4s-.9-1.6-2.7-2.6c-1.9-1.1-3.8-1.1-3.8-1.1z" fill="url(#xcode-original-C)"/><linearGradient id="xcode-original-D" gradientUnits="userSpaceOnUse" x1="58.761" y1="48.855" x2="65.236" y2="52.594"><stop offset="0" stop-color="#b0dff8"/><stop offset="1" stop-color="#52bdf2"/></linearGradient><path d="M58.7 49l-.2.4s2 .3 3.7 1.3c1.6.9 2.8 2.4 2.8 2.4l.2-.4s-1.2-1.5-2.8-2.4c-1.7-1-3.7-1.3-3.7-1.3z" fill="url(#xcode-original-D)"/><linearGradient id="xcode-original-E" gradientUnits="userSpaceOnUse" x1="56.25" y1="53.204" x2="62.727" y2="56.943"><stop offset="0" stop-color="#b4def8"/><stop offset="1" stop-color="#4eb5f0"/></linearGradient><path d="M56.2 53.2l-.2.4s1.9.5 3.6 1.5c1.6.9 2.9 2.2 2.9 2.2l.2-.4s-1.3-1.3-2.9-2.2c-1.6-.9-3.6-1.5-3.6-1.5z" fill="url(#xcode-original-E)"/><linearGradient id="xcode-original-F" gradientUnits="userSpaceOnUse" x1="53.74" y1="57.553" x2="60.215" y2="61.291"><stop offset="0" stop-color="#b4def8"/><stop offset="1" stop-color="#4eb5f0"/></linearGradient><path d="M53.8 57.4l-.3.4s1.8.7 3.5 1.7c1.6.9 3 2 3 2l.2-.4s-1.4-1.1-3-2c-1.6-.9-3.4-1.7-3.4-1.7z" fill="url(#xcode-original-F)"/><linearGradient id="xcode-original-G" gradientUnits="userSpaceOnUse" x1="51.239" y1="61.886" x2="57.713" y2="65.624"><stop offset="0" stop-color="#b5ddf8"/><stop offset="1" stop-color="#46aeee"/></linearGradient><path d="M51.1 62.1l.2-.4 6.5 3.7-.2.4-6.5-3.7z" fill="url(#xcode-original-G)"/><linearGradient id="xcode-original-H" gradientUnits="userSpaceOnUse" x1="48.735" y1="66.22" x2="55.211" y2="69.959"><stop offset="0" stop-color="#96cef4"/><stop offset="1" stop-color="#46aaee"/></linearGradient><path d="M48.7 66.4l.2-.4s1.6 1.2 3.3 2.1c1.6.9 3.2 1.6 3.2 1.6l-.2.3s-1.7-.7-3.3-1.6c-1.7-.9-3.2-2-3.2-2z" fill="url(#xcode-original-H)"/><path d="M47.1 71.3c-.5-.4-.8-.7-.8-.7l.2-.4s.6.5 1.4 1.1h-.8z" fill="#73b9f1"/><linearGradient id="xcode-original-I" gradientUnits="userSpaceOnUse" x1="42.719" y1="80.135" x2="47.681" y2="83"><stop offset="0" stop-color="#8fc1f2"/><stop offset="1" stop-color="#3193ea"/></linearGradient><path d="M43.2 80.5c.4.3.8.6 1.3.9 1.8 1 3.6.9 3.6.9l-.2.4s-1.8.1-3.6-.9c-.7-.4-1.3-.9-1.7-1.3h.6z" fill="url(#xcode-original-I)"/><linearGradient id="xcode-original-J" gradientUnits="userSpaceOnUse" x1="38.634" y1="83.717" x2="45.11" y2="87.456"><stop offset="0" stop-color="#8fc1f2"/><stop offset="1" stop-color="#3193ea"/></linearGradient><path d="M38.9 83.3l.2-.4s.5 2 2.7 3.2c2 1.1 3.8.5 3.8.5l-.2.4s-1.6.7-3.8-.5c-2.3-1.3-2.7-3.2-2.7-3.2z" fill="url(#xcode-original-J)"/><linearGradient id="xcode-original-K" gradientUnits="userSpaceOnUse" x1="36.124" y1="88.063" x2="42.599" y2="91.802"><stop offset="0" stop-color="#8fc1f2"/><stop offset="1" stop-color="#3193ea"/></linearGradient><path d="M36.4 87.6l.2-.4s.2 2.1 2.6 3.4c2.2 1.2 3.9.3 3.9.3l-.3.4s-1.5 1.1-3.9-.3c-2.5-1.4-2.5-3.4-2.5-3.4z" fill="url(#xcode-original-K)"/><linearGradient id="xcode-original-L" gradientUnits="userSpaceOnUse" x1="76.722" y1="64.933" x2="89.179" y2="71.008"><stop offset=".001"/><stop offset="1" stop-opacity="0"/></linearGradient><path d="M68.8 114.2l42.8-89.9-10.8-5.1-44.6 93.5s1.4.7 3.2 1.5h9.4z" fill="url(#xcode-original-L)"/><radialGradient id="xcode-original-M" cx="95.237" cy="25.132" r="16.181" fx="79.585" fy="25.974" gradientTransform="matrix(-.4494 .8933 -1.5457 -.7777 176.886 -40.4)" gradientUnits="userSpaceOnUse"><stop offset="0"/><stop offset="1" stop-opacity="0"/></radialGradient><path d="M94.1 13.8l20 9.5V52C107.2 48.7 61 26.7 61 26.7s3.2-6.7 6.2-12.9h26.9z" fill="url(#xcode-original-M)"/><radialGradient id="xcode-original-N" cx="51.211" cy="114.953" r="7.901" fx="51.196" fy="117.292" gradientTransform="matrix(.8979 .4402 -.2506 .5111 34.032 33.662)" gradientUnits="userSpaceOnUse"><stop offset=".417" stop-color="#0c0c12"/><stop offset="1" stop-color="#3d4651"/></radialGradient><path d="M44.5 110.2c-.3.6-.8 1.3-.7 2.4.1 4.1 6.8 7.9 10.7 7.9 2.7 0 3.6-1.1 4.6-3.1s-13.5-9.6-14.6-7.2z" fill="url(#xcode-original-N)"/><linearGradient id="xcode-original-O" gradientUnits="userSpaceOnUse" x1="84.758" y1="39.174" x2="94.522" y2="44.149"><stop offset="0" stop-color="#344351"/><stop offset=".1" stop-color="#9697a0"/><stop offset=".181" stop-color="#8b8c95"/><stop offset=".351" stop-color="#787a83"/><stop offset=".47" stop-color="#71747d"/><stop offset=".591" stop-color="#777982"/><stop offset=".749" stop-color="#87898f"/><stop offset=".8" stop-color="#8e8f94"/><stop offset=".849" stop-color="#3d3b42"/><stop offset=".9" stop-color="#606e84"/></linearGradient><path d="M90.6 25.1s10.3 2.5 11.1 3.2-1.3 4.7-1.7 5.3c-3.3 4-13.6 26.1-13.6 26.1l-9.5-5.4s8.5-15.8 11.5-21.4c1.9-3.8 2.2-7.8 2.2-7.8z" fill="url(#xcode-original-O)"/><linearGradient id="xcode-original-P" gradientUnits="userSpaceOnUse" x1="117.884" y1="29.257" x2="106.863" y2="14.364"><stop offset=".27" stop-color="#262b33"/><stop offset=".45" stop-color="#74747e"/><stop offset=".54" stop-color="#b0b0bc"/><stop offset=".73" stop-color="#74747e"/></linearGradient><path d="M114.4 19.9c1.8 1.3 4.2 1 6.1.7 1.3-.2-.7 1.7-2.9 6.1s-2.1 4.7-2.4 4.4c-.3-.3-10.2-5.9-9.9-6.4.4-.5 2-11.4 2.8-11.1 2.9.7 3.4 4.2 6.3 6.3z" fill="url(#xcode-original-P)"/><linearGradient id="xcode-original-Q" gradientUnits="userSpaceOnUse" x1="98.542" y1="30.424" x2="114.815" y2="28.322"><stop offset=".14" stop-color="#606e84"/><stop offset=".4" stop-color="#9899a5"/><stop offset=".73" stop-color="#475768"/><stop offset=".92" stop-color="#262b33"/></linearGradient><path d="M99 32.2c.7-1.1 3.9-7.9 9-7.9 2.3 0 6.7 5.8 7.1 6.6.3.7-.7 3.5-1.2 2.2-.6-1.5-3.1-4.7-5.8-4.7s-6.4 3.1-7.3 4.2c-.9 1-2.5.7-1.8-.4z" fill="url(#xcode-original-Q)"/><linearGradient id="xcode-original-R" gradientUnits="userSpaceOnUse" x1="106.128" y1="31.808" x2="104.549" y2="22.854"><stop offset="0" stop-color="#101215" stop-opacity=".1"/><stop offset=".46" stop-color="#101215" stop-opacity=".7"/><stop offset=".7" stop-color="#474951"/><stop offset=".91" stop-color="#7b7d88"/></linearGradient><path d="M98.8 31.8c.5-.8 2.8-4.3 3.9-5.4s3.9-4 6.3-4.4c2.4-.4 4.9 4.5 4.1 5.5-.6.7-1.6-.1-2.8-1.1-1.2-.9-2-2.7-5.8.2-1.3 1-2.6 1.8-5.6 6.1-.8 1.1-.6-.1-.1-.9z" fill="url(#xcode-original-R)"/><linearGradient id="xcode-original-S" gradientUnits="userSpaceOnUse" x1="58.131" y1="81.721" x2="73.237" y2="89.154"><stop offset=".115" stop-color="#2c3952"/><stop offset=".374" stop-color="#3d414e"/><stop offset=".55" stop-color="#474a54"/><stop offset=".754" stop-color="#4e5057"/><stop offset=".892" stop-color="#323945"/><stop offset="1" stop-color="#143052"/></linearGradient><path d="M86.4 61c.4-.8.9-2-.2-2.9-1.2-.9-6.8-3.9-7.8-4.1-1-.2-1.8 0-2.2.7-.4.7-31.1 53.3-31.7 54.8-.6 1.5-.7 2.6.2 2.9.9.3 11.2 5.2 12.2 6.3 1 1.1 1.5-.1 1.9-.7 1.9-2.4 27.1-56.2 27.6-57z" fill="url(#xcode-original-S)"/><linearGradient id="xcode-original-T" gradientUnits="userSpaceOnUse" x1="81.508" y1="31.679" x2="93.19" y2="6.047"><stop offset=".118" stop-color="#6d7078" stop-opacity="0"/><stop offset=".2" stop-color="#6d7078" stop-opacity=".7"/><stop offset=".34" stop-color="#35363a"/><stop offset=".374" stop-color="#1d1f22"/><stop offset=".4" stop-color="#101215"/><stop offset=".5" stop-color="#16171a"/><stop offset=".56" stop-color="#292a2e"/><stop offset=".688" stop-color="#4b4d51"/><stop offset=".807" stop-color="#63666b"/><stop offset=".915" stop-color="#72757b"/><stop offset="1" stop-color="#777a80"/></linearGradient><path d="M99.5 31.6c.5-.7 1.7-2.7 3.2-4.5 1-1.2 6.4-3.8 7.6-8 .7-2.3-.4-4.6-1.9-5.6-5.1-3.1-13.9-8-26.8-8-8.7 0-12.4 2.9-12.4 2.9h4.4l15.3 6 1.9 8s.2 2.7-.7 5.8c-.6 2.5-.8 4-1.7 6.5.7.3 2.3-.8 4.1-.3 1.6.4 2.6 2.6 3.7 1.3 1.9-2.5 2.5-3 3.3-4.1z" fill="url(#xcode-original-T)"/><linearGradient id="xcode-original-U" gradientUnits="userSpaceOnUse" x1="69.064" y1="16.837" x2="91.026" y2="16.837"><stop offset="0" stop-color="#4a4d56"/><stop offset="1" stop-color="#29292d"/></linearGradient><path d="M90.5 25.4C89.7 18 87.9 11 69.1 11.1c1.2-1.2 4.1-2.4 4.1-2.4l-4.1-.3s.6-.5 1.8-.6c11-.9 20.8 1.4 20.1 15.7-.1 2.3-.3 3.3-.5 1.9z" fill="url(#xcode-original-U)"/><linearGradient id="xcode-original-V" gradientUnits="userSpaceOnUse" x1="69.064" y1="11.697" x2="88.054" y2="11.697"><stop offset="0" stop-color="#767880"/><stop offset=".41" stop-color="#0c0a0b"/></linearGradient><path d="M69.1 11.1c1.3-.5 3.1-.8 6.5-.6 4.2.2 9.5 1.8 11.7 3.8 1.1 1 1 .2-.2-1.1-3.1-3.6-7.8-4.4-13.9-4.5-.7-.1-3 1.2-4.1 2.4z" fill="url(#xcode-original-V)"/><linearGradient id="xcode-original-W" gradientUnits="userSpaceOnUse" x1="116.332" y1="34.756" x2="123.707" y2="21.982"><stop offset="0" stop-color="#858997"/><stop offset=".23" stop-color="#244668"/><stop offset=".282" stop-color="#1a3249"/><stop offset=".4" stop-color="#040506"/><stop offset=".464" stop-color="#313236"/><stop offset=".546" stop-color="#65656e"/><stop offset=".607" stop-color="#868691"/><stop offset=".64" stop-color="#92929e"/></linearGradient><path d="M120.7 20.6l5.5 2.8s-2.1 2.8-3.8 6c-1.8 3.4-3 7.1-3 7.1l-5.3-3.2s1.3-3.6 3.2-7.1c1.5-2.9 3.4-5.6 3.4-5.6z" fill="url(#xcode-original-W)"/><path d="M126.2 23.4c.4.2-.9 3.3-2.8 6.9-1.9 3.6-3.7 6.4-4 6.2-.4-.2.9-3.3 2.8-6.9 1.8-3.6 3.6-6.4 4-6.2z" fill="#bfc0d0"/></svg>
`,
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    command: 'antigravity',
    icon: (isDark) => isDark
      ? `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="540" height="540">
<path d="M0 0 C29.28357 24.20916076 42.18943725 60.19334985 53.58984375 95.33203125 C53.8248012 96.05568123 54.05975864 96.77933121 54.30183601 97.52490997 C59.51521919 113.64363559 64.07767498 129.92626183 68.55615234 146.26153564 C70.81239312 154.4862053 73.10661464 162.70034312 75.40234375 170.9140625 C75.73680826 172.1110911 75.73680826 172.1110911 76.07802963 173.33230209 C91.15816335 227.25753379 108.02786499 283.13884299 147.56860352 324.46313477 C153.39265569 330.63941857 159.03872419 337.42902663 159.6875 346.1875 C159.41521511 350.13563087 158.95291547 351.79400144 156.4375 354.8125 C149.03412918 359.27184032 140.60066784 358.99040901 132.35546875 357.109375 C119.14962892 352.26783591 107.4294931 341.43054126 97.4375 331.8125 C96.88771484 331.29381348 96.33792969 330.77512695 95.77148438 330.24072266 C73.81218937 309.4548701 58.24123192 284.00365641 43.25244141 257.95654297 C31.08396375 236.54216132 31.08396375 236.54216132 16.4375 216.8125 C15.69242187 215.91789063 14.94734375 215.02328125 14.1796875 214.1015625 C2.20648968 200.20931555 -13.15553783 190.27387466 -31.72070312 188.51293945 C-34.94548902 188.37675426 -38.14755382 188.34443661 -41.375 188.375 C-42.51283936 188.38329834 -43.65067871 188.39159668 -44.82299805 188.40014648 C-65.29875181 188.81004082 -81.11449567 196.90197427 -95.82421875 210.9765625 C-108.98312351 224.72608238 -118.07140634 242.47768005 -127.5625 258.8125 C-139.99102475 280.20283933 -152.63906147 301.29010851 -169.48828125 319.55078125 C-171.36371586 321.59574667 -173.15282533 323.68869475 -174.9375 325.8125 C-182.01537798 333.85335458 -190.12372841 340.40412272 -198.75 346.6875 C-199.49805908 347.23494873 -200.24611816 347.78239746 -201.0168457 348.34643555 C-211.41876423 355.78621074 -221.48729401 360.2325886 -234.5625 358.8125 C-238.4220971 357.6333475 -241.59883957 356.39633793 -243.74609375 352.8671875 C-245.30244831 348.95023774 -245.12965883 345.55319491 -243.828125 341.55859375 C-240.3367992 333.67781124 -234.46180877 327.9140827 -228.5625 321.8125 C-183.52798748 274.32155952 -168.26476907 204.26376173 -151.39805889 143.04586124 C-146.64713591 125.81102862 -141.70003119 108.67420052 -136.1796875 91.66796875 C-135.93121944 90.90046421 -135.68275139 90.13295967 -135.426754 89.34219742 C-129.53332553 71.19840771 -122.60002076 53.63655838 -113.5625 36.8125 C-113.00046875 35.75933594 -112.4384375 34.70617187 -111.859375 33.62109375 C-100.1930847 12.71444735 -84.1325042 -4.11405042 -60.9375 -11.3125 C-40.01592532 -16.73661195 -17.44326808 -12.88213084 0 0 Z " fill="#FFFFFF" transform="translate(311.5625,97.1875)"/>
</svg>
`
      : `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="540" height="540">
<path d="M0 0 C29.28357 24.20916076 42.18943725 60.19334985 53.58984375 95.33203125 C53.8248012 96.05568123 54.05975864 96.77933121 54.30183601 97.52490997 C59.51521919 113.64363559 64.07767498 129.92626183 68.55615234 146.26153564 C70.81239312 154.4862053 73.10661464 162.70034312 75.40234375 170.9140625 C75.73680826 172.1110911 75.73680826 172.1110911 76.07802963 173.33230209 C91.15816335 227.25753379 108.02786499 283.13884299 147.56860352 324.46313477 C153.39265569 330.63941857 159.03872419 337.42902663 159.6875 346.1875 C159.41521511 350.13563087 158.95291547 351.79400144 156.4375 354.8125 C149.03412918 359.27184032 140.60066784 358.99040901 132.35546875 357.109375 C119.14962892 352.26783591 107.4294931 341.43054126 97.4375 331.8125 C96.88771484 331.29381348 96.33792969 330.77512695 95.77148438 330.24072266 C73.81218937 309.4548701 58.24123192 284.00365641 43.25244141 257.95654297 C31.08396375 236.54216132 31.08396375 236.54216132 16.4375 216.8125 C15.69242187 215.91789063 14.94734375 215.02328125 14.1796875 214.1015625 C2.20648968 200.20931555 -13.15553783 190.27387466 -31.72070312 188.51293945 C-34.94548902 188.37675426 -38.14755382 188.34443661 -41.375 188.375 C-42.51283936 188.38329834 -43.65067871 188.39159668 -44.82299805 188.40014648 C-65.29875181 188.81004082 -81.11449567 196.90197427 -95.82421875 210.9765625 C-108.98312351 224.72608238 -118.07140634 242.47768005 -127.5625 258.8125 C-139.99102475 280.20283933 -152.63906147 301.29010851 -169.48828125 319.55078125 C-171.36371586 321.59574667 -173.15282533 323.68869475 -174.9375 325.8125 C-182.01537798 333.85335458 -190.12372841 340.40412272 -198.75 346.6875 C-199.49805908 347.23494873 -200.24611816 347.78239746 -201.0168457 348.34643555 C-211.41876423 355.78621074 -221.48729401 360.2325886 -234.5625 358.8125 C-238.4220971 357.6333475 -241.59883957 356.39633793 -243.74609375 352.8671875 C-245.30244831 348.95023774 -245.12965883 345.55319491 -243.828125 341.55859375 C-240.3367992 333.67781124 -234.46180877 327.9140827 -228.5625 321.8125 C-183.52798748 274.32155952 -168.26476907 204.26376173 -151.39805889 143.04586124 C-146.64713591 125.81102862 -141.70003119 108.67420052 -136.1796875 91.66796875 C-135.93121944 90.90046421 -135.68275139 90.13295967 -135.426754 89.34219742 C-129.53332553 71.19840771 -122.60002076 53.63655838 -113.5625 36.8125 C-113.00046875 35.75933594 -112.4384375 34.70617187 -111.859375 33.62109375 C-100.1930847 12.71444735 -84.1325042 -4.11405042 -60.9375 -11.3125 C-40.01592532 -16.73661195 -17.44326808 -12.88213084 0 0 Z " fill="#202124" transform="translate(311.5625,97.1875)"/>
</svg>
`,
  },
]

/**
 * @param {string} svgString
 * @returns {string}
 */
function svgToDataUri(svgString) {
  return 'data:image/svg+xml,' + encodeURIComponent(svgString)
}

export const availableEditors = ref([])
export const editorsLoading = ref(false)
export const editorsDetected = ref(false)

/**
 * @param {boolean} [isDark=true]
 * @returns {EditorDef[]}
 */
export function getAllEditorDefs(isDark = true) {
  return EDITORS.map(e => ({
    ...e,
    iconSrc: svgToDataUri(e.icon(isDark)),
  }))
}

/**
 * @param {string} editorId
 * @param {boolean} [isDark=true]
 * @returns {EditorDef|undefined}
 */
export function getEditorDef(editorId, isDark = true) {
  const e = EDITORS.find(ed => ed.id === editorId)
  if (!e) return undefined
  return { ...e, iconSrc: svgToDataUri(e.icon(isDark)) }
}

let detectRequested = false

export function detectEditors() {
  if (fileSystem.isVirtual.value || fileSystem.fallbackMode) return
  if (!fileSystem.socket || fileSystem.socket.readyState !== WebSocket.OPEN) {
    detectRequested = true
    return
  }
  
  // If we already detected or are loading, don't ping the server again
  if (editorsLoading.value || editorsDetected.value) return

  editorsLoading.value = true
  fileSystem.socket.send(JSON.stringify({ type: 'detect-editors' }))
}

watch(() => fileSystem.isConnected.value, (connected) => {
  if (connected && detectRequested) {
    detectRequested = false
    detectEditors()
  }
})

export function openInEditor(editorId) {
  if (fileSystem.isVirtual.value || fileSystem.fallbackMode) return
  if (!fileSystem.socket || fileSystem.socket.readyState !== WebSocket.OPEN) return

  fileSystem.socket.send(JSON.stringify({ type: 'open-in-editor', editorId }))
}

fileSystem.on((msg) => {
  if (msg.type === 'editors-detected') {
    availableEditors.value = msg.editors || []
    editorsLoading.value = false
    editorsDetected.value = true
  }
})
