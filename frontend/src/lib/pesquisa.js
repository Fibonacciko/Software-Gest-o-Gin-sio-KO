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
 */

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
 * @param numeros    Campos numéricos: telefone e números aceitam parte em
 *                   qualquer posição, porque as pessoas lembram-se do fim.
 */
export const corresponde = (procurado, principal, extras = [], numeros = []) => {
  const termos = emPalavras(procurado);
  if (termos.length === 0) return true;

  const palavras = [...emPalavras(principal), ...extras.flatMap(emPalavras)];
  const digitos = numeros.map((n) => String(n ?? '').replace(/\D/g, '')).filter(Boolean);
  const textos = numeros.map(normalizar).filter(Boolean);

  return termos.every((termo) => {
    if (palavras.some((p) => p.startsWith(termo))) return true;
    if (textos.some((t) => t.startsWith(termo) || t.replace(/^0+/, '').startsWith(termo))) return true;
    if (/^\d+$/.test(termo) && digitos.some((d) => d.includes(termo))) return true;
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
