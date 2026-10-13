/**
 * Pesquisa igual em toda a aplicação.
 *
 * Regras, iguais às do servidor (ver `corresponde_pesquisa` em server.py):
 *
 * - Procura pelo **início** das palavras, nunca a meio: "i" mostra "Inês"
 *   e "Ana Isabel", mas não "Maria".
 * - Funciona desde a primeira letra.
 * - Ignora maiúsculas, acentos e as ligações dos nomes ("de", "da", "dos").
 * - A ordem das palavras não importa: "silva joao" encontra "João da Silva".
 * - Quem tem o **nome principal** a começar pelas letras escritas aparece
 *   primeiro na lista.
 * - **Escrever só dígitos é procurar um número de sócio.** O 002 encontra-se
 *   escrevendo "2", e a lista vem por número: 2, 20, 21, 22… e só mais à
 *   frente o 200. Dentro do telefone só se procura a partir de três dígitos,
 *   senão "2" trazia toda a gente que tem um 2 no número.
 */

/** A partir de quantos dígitos é que se procura dentro do telefone. */
const DIGITOS_PARA_TELEFONE = 3;

const soDigitos = (texto) => /^\d+$/.test(String(texto ?? '').trim());

/** O número de sócio como número, para 2 vir antes de 20 e de 200. */
const comoNumero = (valor) => {
  const n = parseInt(String(valor ?? '').trim(), 10);
  return Number.isNaN(n) ? Infinity : n;
};

const LIGACOES = ['de', 'da', 'do', 'das', 'dos', 'e', 'du', 'del', 'di', 'van', 'von'];

export const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const emPalavras = (texto) =>
  normalizar(texto)
    .split(/\s+/)
    .filter((p) => p && !LIGACOES.includes(p));

/**
 * @param procurado  O que foi escrito na caixa de pesquisa.
 * @param principal  O texto que manda: nome do sócio, do artigo, do utilizador.
 * @param extras     Outros campos onde também vale procurar (descrição, email...).
 * @param numeros    Campos numéricos. O **primeiro é o número** (de sócio, de
 *                   artigo): procura-se pelo início, com ou sem os zeros da
 *                   frente. Os restantes são telefones e afins: aceitam parte
 *                   em qualquer posição, porque as pessoas lembram-se do fim,
 *                   mas só a partir de três dígitos.
 */
export const corresponde = (procurado, principal, extras = [], numeros = []) => {
  const termos = emPalavras(procurado);
  if (termos.length === 0) return true;

  const palavras = [...emPalavras(principal), ...extras.flatMap(emPalavras)];
  const numero = normalizar(numeros[0]);
  const digitos = numeros.map((n) => String(n ?? '').replace(/\D/g, '')).filter(Boolean);

  return termos.every((termo) => {
    if (palavras.some((p) => p.startsWith(termo))) return true;
    if (numero && (numero.startsWith(termo) || numero.replace(/^0+/, '').startsWith(termo))) return true;
    if (termo.length >= DIGITOS_PARA_TELEFONE && /^\d+$/.test(termo)
        && digitos.some((d) => d.includes(termo))) return true;
    return false;
  });
};

/** 0 para quem tem o nome principal a começar pelo escrito, 1 para os restantes. */
export const relevancia = (procurado, principal) => {
  const termos = emPalavras(procurado);
  const palavras = emPalavras(principal);
  if (termos.length === 0 || palavras.length === 0) return 1;
  return termos.some((t) => palavras[0].startsWith(t)) ? 0 : 1;
};

/** Filtra e ordena: nome principal primeiro, depois por ordem alfabética. */
export const filtrarEOrdenar = (lista, procurado, obter) => {
  const termo = String(procurado ?? '').trim();

  const filtrada = termo
    ? lista.filter((item) => {
        const { principal, extras, numeros } = obter(item);
        return corresponde(termo, principal, extras, numeros);
      })
    : [...lista];

  // Quem escreve dígitos procura um número: a lista vem por número
  if (termo && soDigitos(termo)) {
    return filtrada.sort((a, b) => {
      const na = comoNumero(obter(a).numeros?.[0]);
      const nb = comoNumero(obter(b).numeros?.[0]);
      if (na !== nb) return na - nb;
      return normalizar(obter(a).principal).localeCompare(normalizar(obter(b).principal));
    });
  }

  return filtrada.sort((a, b) => {
    const pa = obter(a).principal;
    const pb = obter(b).principal;
    if (termo) {
      const ra = relevancia(termo, pa);
      const rb = relevancia(termo, pb);
      if (ra !== rb) return ra - rb;
    }
    return normalizar(pa).localeCompare(normalizar(pb));
  });
};
