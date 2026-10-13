/**
 * A pesquisa do lado do ecrã.
 *
 * Tem de dar o mesmo que a do servidor (`corresponde_pesquisa` e
 * `test_pesquisa.py`): as duas são usadas em sítios diferentes da aplicação e
 * é confuso quando a mesma procura dá listas diferentes.
 */
import { corresponde, filtrarEOrdenar, relevancia } from './pesquisa';

const socio = (numero, nome, telefone = '912345678') => ({ numero, nome, telefone });
const campos = (s) => ({ principal: s.nome, extras: [], numeros: [s.numero, s.telefone] });

describe('procurar por nome', () => {
  test('ignora maiúsculas, acentos e as ligações', () => {
    expect(corresponde('joao', 'João Pedro da Silva')).toBe(true);
    expect(corresponde('JOÃO', 'Joao Pedro da Silva')).toBe(true);
    expect(corresponde('joao silva', 'João Pedro da Silva')).toBe(true);
    expect(corresponde('silva joao', 'João Pedro da Silva')).toBe(true);
  });

  test('procura pelo início das palavras, nunca a meio', () => {
    expect(corresponde('i', 'Inês Ferreira')).toBe(true);
    expect(corresponde('i', 'Ana Isabel Costa')).toBe(true);
    expect(corresponde('i', 'Maria Silva')).toBe(false);
    expect(corresponde('ria', 'Maria Silva')).toBe(false);
  });

  test('o nome próprio tem preferência', () => {
    expect(relevancia('i', 'Inês Ferreira')).toBe(0);
    expect(relevancia('i', 'Ana Isabel Costa')).toBe(1);
  });
});

describe('procurar por número de sócio', () => {
  test('encontra-se sem escrever os zeros da frente', () => {
    expect(corresponde('2', 'Fábio Guerreiro', [], ['002', '912345678'])).toBe(true);
    expect(corresponde('002', 'Fábio Guerreiro', [], ['002', '912345678'])).toBe(true);
    expect(corresponde('2', 'Outro', [], ['020', '913000000'])).toBe(true);
    expect(corresponde('2', 'Outro', [], ['200', '913000000'])).toBe(true);
    expect(corresponde('2', 'Outro', [], ['003', '913000000'])).toBe(false);
  });

  test('até três dígitos procura-se só o número de sócio', () => {
    // Senão "2" trazia toda a gente que tem um 2 no número, que é quase toda,
    // e "913" trazia meio ginásio
    expect(corresponde('2', 'João', [], ['007', '912345678'])).toBe(false);
    expect(corresponde('45', 'João', [], ['007', '912345678'])).toBe(false);
    expect(corresponde('456', 'João', [], ['007', '912345678'])).toBe(false);
  });

  test('do quarto dígito em diante já se procura no telemóvel, em qualquer posição', () => {
    expect(corresponde('4567', 'João', [], ['007', '912345678'])).toBe(true);
    expect(corresponde('5678', 'João', [], ['007', '912345678'])).toBe(true);
  });
});

describe('ordem dos resultados', () => {
  test('escrever um número dá a lista por número: 2, 20, 21, 22… e só depois 200', () => {
    const lista = [
      socio('200', 'Carlos Melo'),
      socio('021', 'Zacarias Nunes'),
      socio('002', 'Fábio Guerreiro'),
      socio('201', 'Daniela Reis'),
      socio('020', 'Ana Antunes'),
      socio('022', 'Bruno Dias'),
      socio('003', 'Elsa Pinto')
    ];
    expect(filtrarEOrdenar(lista, '2', campos).map((s) => s.numero))
      .toEqual(['002', '020', '021', '022', '200', '201']);
  });

  test('procurar um telemóvel ordena pelos nomes, não por número', () => {
    const lista = [
      socio('030', 'Zulmira Nunes', '915500100'),
      socio('031', 'Aurora Pinto', '915500200')
    ];
    expect(filtrarEOrdenar(lista, '9155', campos).map((s) => s.nome))
      .toEqual(['Aurora Pinto', 'Zulmira Nunes']);
  });

  test('escrever letras continua a mandar nos nomes', () => {
    const lista = [socio('010', 'Dias Costa'), socio('011', 'Dias Antunes')];
    expect(filtrarEOrdenar(lista, 'dias', campos).map((s) => s.nome))
      .toEqual(['Dias Antunes', 'Dias Costa']);
  });

  test('sem nada escrito, devolve tudo por ordem alfabética', () => {
    const lista = [socio('002', 'Bruno'), socio('001', 'Ana')];
    expect(filtrarEOrdenar(lista, '', campos).map((s) => s.nome)).toEqual(['Ana', 'Bruno']);
  });
});
