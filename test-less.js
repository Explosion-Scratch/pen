import less from 'less';
const code = `
#app {
  @apply flex h-screen justify-center items-center;
}
`;
less.render(code).then(res => console.log(res.css));
