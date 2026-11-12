import { registerRootComponent } from 'expo';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/**
 * A entrada **só do navegador**, para se poder ver a aplicação no PC.
 *
 * No telemóvel o Skia é código nativo e arranca sozinho; no navegador é um
 * ficheiro WebAssembly que tem de estar carregado **antes** de a aplicação
 * ser sequer lida — por isso o `App` é importado aqui dentro, e não no topo:
 * um `import` no topo é avaliado primeiro, e o fundo rebentava a arrancar
 * com o Skia ainda a meio de carregar.
 *
 * Este ficheiro nunca entra no APK: o Metro só o escolhe quando a plataforma
 * é `web` — o telemóvel continua a usar o `index.ts`, que não sabe nada disto.
 */
LoadSkiaWeb({ locateFile: (ficheiro) => `/static/js/${ficheiro}` })
  .then(async () => {
    const App = (await import('./App')).default;
    registerRootComponent(App);
  })
  .catch(async (erro) => {
    // Sem Skia não há fundo, mas o resto da aplicação deve poder ver-se.
    console.warn('Nao consegui carregar o Skia no navegador:', erro);
    const App = (await import('./App')).default;
    registerRootComponent(App);
  });
