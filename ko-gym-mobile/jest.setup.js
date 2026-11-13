/**
 * O que os testes precisam de ter antes de correrem.
 *
 * O `api.ts` guarda a sessão do sócio no armazenamento do telemóvel, e esse
 * é um módulo nativo: num teste não existe aparelho nenhum por baixo. A
 * própria biblioteca traz um substituto para isto, e é o que se usa — assim
 * testa-se o que é nosso (os endereços, as contas) sem ter de fingir um
 * telemóvel inteiro.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
