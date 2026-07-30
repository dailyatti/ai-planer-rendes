const ALLOWED_EXPRESSION = /^[0-9+\-*/.()\s]+$/;

export const evaluateArithmeticExpression = (expression: string): number => {
  if (!ALLOWED_EXPRESSION.test(expression)) {
    throw new Error('Unsupported character in expression.');
  }

  let index = 0;

  const skipWhitespace = () => {
    while (/\s/.test(expression[index] ?? '')) index += 1;
  };

  const parseNumber = (): number => {
    skipWhitespace();
    const start = index;
    let decimalPoints = 0;

    while (/[0-9.]/.test(expression[index] ?? '')) {
      if (expression[index] === '.') decimalPoints += 1;
      index += 1;
    }

    if (start === index || decimalPoints > 1) {
      throw new Error('Invalid number.');
    }

    const value = Number(expression.slice(start, index));
    if (!Number.isFinite(value)) throw new Error('Invalid number.');
    return value;
  };

  const parseFactor = (): number => {
    skipWhitespace();

    if (expression[index] === '+' || expression[index] === '-') {
      const sign = expression[index] === '-' ? -1 : 1;
      index += 1;
      return sign * parseFactor();
    }

    if (expression[index] === '(') {
      index += 1;
      const value = parseExpression();
      skipWhitespace();
      if (expression[index] !== ')') throw new Error('Missing closing parenthesis.');
      index += 1;
      return value;
    }

    return parseNumber();
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    skipWhitespace();

    while (expression[index] === '*' || expression[index] === '/') {
      const operator = expression[index];
      index += 1;
      const operand = parseFactor();
      if (operator === '/' && operand === 0) throw new Error('Division by zero.');
      value = operator === '*' ? value * operand : value / operand;
      skipWhitespace();
    }

    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    skipWhitespace();

    while (expression[index] === '+' || expression[index] === '-') {
      const operator = expression[index];
      index += 1;
      const operand = parseTerm();
      value = operator === '+' ? value + operand : value - operand;
      skipWhitespace();
    }

    return value;
  };

  const result = parseExpression();
  skipWhitespace();
  if (index !== expression.length || !Number.isFinite(result)) {
    throw new Error('Invalid expression.');
  }
  return result;
};
