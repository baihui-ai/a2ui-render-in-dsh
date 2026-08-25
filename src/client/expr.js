// Tiny safe math-expression compiler for Chart function plotting.
// Grammar: numbers, variable x, constants pi/e, + - * / % ^ (right-assoc),
// unary minus, parentheses, whitelisted functions. No eval, no identifiers
// outside the whitelist — a model-authored expression can only compute math.
const FUNCTIONS = {
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
	cot: (v) => 1 / Math.tan(v),
	sec: (v) => 1 / Math.cos(v),
	csc: (v) => 1 / Math.sin(v),
	asin: Math.asin,
	acos: Math.acos,
	atan: Math.atan,
	sinh: Math.sinh,
	cosh: Math.cosh,
	tanh: Math.tanh,
	sqrt: Math.sqrt,
	cbrt: Math.cbrt,
	abs: Math.abs,
	exp: Math.exp,
	ln: Math.log,
	log: Math.log,
	log2: Math.log2,
	log10: Math.log10,
	floor: Math.floor,
	ceil: Math.ceil,
	round: Math.round,
	sign: Math.sign,
	min: Math.min,
	max: Math.max,
	pow: Math.pow,
	atan2: Math.atan2
};

const CONSTANTS = { pi: Math.PI, "π": Math.PI, e: Math.E };

const BINARY = {
	"+": { prec: 1, fn: (a, b) => a + b },
	"-": { prec: 1, fn: (a, b) => a - b },
	"*": { prec: 2, fn: (a, b) => a * b },
	"/": { prec: 2, fn: (a, b) => a / b },
	"%": { prec: 2, fn: (a, b) => a % b },
	"^": { prec: 4, rightAssoc: true, fn: (a, b) => Math.pow(a, b) }
};
const UNARY_MINUS_PREC = 3;

function tokenize(source) {
	const tokens = [];
	let index = 0;
	while (index < source.length) {
		const ch = source[index];
		if (/\s/.test(ch)) {
			index++;
		} else if (/[0-9.]/.test(ch)) {
			const match = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(source.slice(index));
			if (match === null) throw new Error(`bad number at ${index}`);
			tokens.push({ kind: "num", value: Number(match[0]) });
			index += match[0].length;
		} else if (/[A-Za-zπ_]/.test(ch)) {
			const match = /^[A-Za-zπ_][A-Za-z0-9_]*/.exec(source.slice(index));
			tokens.push({ kind: "name", value: match[0] });
			index += match[0].length;
		} else if (ch in BINARY) {
			tokens.push({ kind: "op", value: ch });
			index++;
		} else if (ch === "(" || ch === ")" || ch === ",") {
			tokens.push({ kind: ch });
			index++;
		} else {
			throw new Error(`unexpected character "${ch}"`);
		}
	}
	return tokens;
}

/** Shunting-yard to RPN; validates every name against the whitelist + allowed variables. */
function toRpn(tokens, allowedVars) {
	const output = [];
	const stack = [];
	let prev = null;
	for (const token of tokens) {
		if (token.kind === "num") {
			output.push(token);
		} else if (token.kind === "name") {
			const name = token.value;
			if (allowedVars.has(name)) output.push({ kind: "var", value: name });
			else if (name in CONSTANTS) output.push({ kind: "num", value: CONSTANTS[name] });
			else if (name in FUNCTIONS) stack.push({ kind: "fn", value: name, argc: 1 });
			else throw new Error(`unknown identifier "${name}"`);
		} else if (token.kind === "op") {
			const isUnary = token.value === "-" && (prev === null || prev.kind === "op" || prev.kind === "(" || prev.kind === ",");
			if (isUnary) {
				stack.push({ kind: "neg" });
			} else {
				const op = BINARY[token.value];
				while (stack.length > 0) {
					const top = stack[stack.length - 1];
					const topPrec = top.kind === "neg" ? UNARY_MINUS_PREC : top.kind === "op" ? BINARY[top.value].prec : -1;
					if (topPrec > op.prec || (topPrec === op.prec && op.rightAssoc !== true)) output.push(stack.pop());
					else break;
				}
				stack.push(token);
			}
		} else if (token.kind === "(") {
			stack.push(token);
		} else if (token.kind === ",") {
			while (stack.length > 0 && stack[stack.length - 1].kind !== "(") output.push(stack.pop());
			if (stack.length === 0) throw new Error("misplaced comma");
			const fn = stack[stack.length - 2];
			if (fn === undefined || fn.kind !== "fn") throw new Error("comma outside a function call");
			fn.argc++;
		} else if (token.kind === ")") {
			while (stack.length > 0 && stack[stack.length - 1].kind !== "(") output.push(stack.pop());
			if (stack.pop() === undefined) throw new Error("unbalanced parentheses");
			if (stack.length > 0 && stack[stack.length - 1].kind === "fn") output.push(stack.pop());
		}
		prev = token;
	}
	while (stack.length > 0) {
		const top = stack.pop();
		if (top.kind === "(") throw new Error("unbalanced parentheses");
		output.push(top);
	}
	return output;
}

/**
 * Compile an expression over the given variable names to an evaluator over a
 * scope object; yields a finite number or null (domain error / non-finite).
 * @throws {Error} on a syntax error or non-whitelisted identifier.
 */
export function compileScopedExpression(source, allowedVars) {
	if (typeof source !== "string" || source.trim() === "") throw new Error("empty expression");
	const allowed = new Set(allowedVars);
	const rpn = toRpn(tokenize(source), allowed);
	if (rpn.length === 0) throw new Error("empty expression");
	return (scope) => {
		const stack = [];
		for (const token of rpn) {
			if (token.kind === "num") stack.push(token.value);
			else if (token.kind === "var") {
				const value = scope[token.value];
				if (typeof value !== "number" || !Number.isFinite(value)) return null;
				stack.push(value);
			}
			else if (token.kind === "neg") stack.push(-stack.pop());
			else if (token.kind === "op") {
				const b = stack.pop();
				const a = stack.pop();
				if (a === undefined || b === undefined) return null;
				stack.push(BINARY[token.value].fn(a, b));
			} else if (token.kind === "fn") {
				const args = stack.splice(stack.length - token.argc, token.argc);
				if (args.length !== token.argc) return null;
				stack.push(FUNCTIONS[token.value](...args));
			}
		}
		if (stack.length !== 1) return null;
		const result = stack[0];
		return typeof result === "number" && Number.isFinite(result) ? result : null;
	};
}

/** Back-compat single-variable form: a function of x. */
export function compileExpression(source, extraVars = []) {
	const fn = compileScopedExpression(source, ["x", ...extraVars]);
	return (x, extra) => fn({ x, ...extra });
}
