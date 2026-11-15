import fs from 'fs';
import path from 'path';
import { MINUTOS_PARA_DESMARCAR, prazoParaDesmarcar } from './aulas';

describe('o prazo para desmarcar, escrito em português', () => {
  it('as horas inteiras', () => {
    expect(prazoParaDesmarcar(120)).toBe('2 horas');
    expect(prazoParaDesmarcar(180)).toBe('3 horas');
  });

  it('uma hora não leva "s"', () => {
    expect(prazoParaDesmarcar(60)).toBe('1 hora');
  });

  it('hora e meia lê-se como no horário do ginásio', () => {
    expect(prazoParaDesmarcar(90)).toBe('1h30');
    expect(prazoParaDesmarcar(150)).toBe('2h30');
  });

  it('menos de uma hora conta-se em minutos', () => {
    expect(prazoParaDesmarcar(30)).toBe('30 minutos');
  });
});

/**
 * O servidor é que manda. Este teste lê o `server.py` e falha no momento em
 * que os dois valores se separarem — que é o que já estava a acontecer com o
 * "2 horas" escrito à mão dentro do ecrã das aulas.
 */
describe('o número é o mesmo do servidor', () => {
  const servidor = path.join(__dirname, '..', '..', '..', 'backend', 'server.py');

  it('o server.py está onde se espera', () => {
    // Sem isto, o teste a seguir passava a comparar com nada
    expect(fs.existsSync(servidor)).toBe(true);
  });

  it('o MINUTOS_PARA_DESMARCAR bate com o do servidor', () => {
    const codigo = fs.readFileSync(servidor, 'utf8');
    const achado = /^MINUTOS_PARA_DESMARCAR\s*=\s*(\d+)/m.exec(codigo);
    expect(achado).not.toBeNull();
    expect(Number(achado![1])).toBe(MINUTOS_PARA_DESMARCAR);
  });
});
