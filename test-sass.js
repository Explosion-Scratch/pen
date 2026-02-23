const sass = require('sass');
const code = `
#app {
  @apply flex h-screen justify-center items-center;
}
`;
console.log(sass.compileString(code).css);
