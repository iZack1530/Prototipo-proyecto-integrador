using System;
using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Formulas
{
    /// <summary>
    /// Evaluador seguro de fórmulas: reconoce las variables B (base), N (nivel) y E (esfuerzo),
    /// los operadores + - * / ^ (** como ^) y las funciones floor, ceil, round, sqrt, abs, min y max.
    /// Reproduce la gramática y la aritmética de double del evaluador del Laboratorio JS.
    /// </summary>
    public static class EvaluadorFormulas
    {
        public delegate double Funcion(double b, double n, double e);

        private static readonly Dictionary<string, Func<double[], double>> Funciones =
            new Dictionary<string, Func<double[], double>>
        {
            { "floor", a => Math.Floor(a[0]) },
            { "ceil", a => Math.Ceiling(a[0]) },
            { "round", a => RedondearJs(a[0]) },
            { "sqrt", a => Math.Sqrt(a[0]) },
            { "abs", a => Math.Abs(a[0]) },
            { "min", a => a.Length == 0 ? double.NaN : Minimo(a) },
            { "max", a => a.Length == 0 ? double.NaN : Maximo(a) },
        };

        private static double Minimo(double[] valores)
        {
            double resultado = valores[0];
            for (int i = 1; i < valores.Length; i++) resultado = Math.Min(resultado, valores[i]);
            return resultado;
        }

        private static double Maximo(double[] valores)
        {
            double resultado = valores[0];
            for (int i = 1; i < valores.Length; i++) resultado = Math.Max(resultado, valores[i]);
            return resultado;
        }

        private static readonly Dictionary<string, Funcion> Cache = new Dictionary<string, Funcion>();

        /// <summary>Redondeo con semántica de Math.round de JavaScript (mitad hacia +infinito).</summary>
        public static double RedondearJs(double valor)
        {
            return Math.Floor(valor + 0.5);
        }

        /// <summary>Devuelve null cuando la fórmula no es válida.</summary>
        public static Funcion Compilar(string formula)
        {
            if (formula == null) return null;
            Funcion compilada;
            lock (Cache)
            {
                if (Cache.TryGetValue(formula, out compilada)) return compilada;
            }

            try
            {
                compilada = new Analizador(formula).Analizar();
            }
            catch (FormatException)
            {
                compilada = null;
            }

            lock (Cache)
            {
                Cache[formula] = compilada;
            }
            return compilada;
        }

        /// <summary>Calcula una fórmula; devuelve NaN si no es válida o el resultado no es finito.</summary>
        public static double Calcular(string formula, double b, double n, double e)
        {
            Funcion fn = Compilar(formula);
            if (fn == null) return double.NaN;
            double v = fn(b, n, e);
            return double.IsNaN(v) || double.IsInfinity(v) ? double.NaN : v;
        }

        private sealed class Analizador
        {
            private enum Tipo { Numero, Variable, Funcion, Operador, Apertura, Cierre, Coma }

            private struct Simbolo
            {
                public Tipo Tipo;
                public string Texto;
                public double Numero;
            }

            private readonly List<Simbolo> _simbolos = new List<Simbolo>();
            private int _posicion;

            public Analizador(string formula)
            {
                Tokenizar(formula);
                if (_simbolos.Count == 0) throw new FormatException("fórmula vacía");
            }

            public Funcion Analizar()
            {
                Funcion resultado = Expresion();
                if (_posicion < _simbolos.Count) throw new FormatException("sobran símbolos");
                return resultado;
            }

            private void Tokenizar(string fuente)
            {
                int i = 0;
                while (i < fuente.Length)
                {
                    char c = fuente[i];
                    if (char.IsWhiteSpace(c)) { i++; continue; }

                    if (char.IsDigit(c) || c == '.')
                    {
                        int inicio = i;
                        while (i < fuente.Length && char.IsDigit(fuente[i])) i++;
                        if (i < fuente.Length && fuente[i] == '.')
                        {
                            i++;
                            while (i < fuente.Length && char.IsDigit(fuente[i])) i++;
                        }
                        if (i < fuente.Length && (fuente[i] == 'e' || fuente[i] == 'E'))
                        {
                            int guardado = i;
                            i++;
                            if (i < fuente.Length && (fuente[i] == '+' || fuente[i] == '-')) i++;
                            int inicioExponente = i;
                            while (i < fuente.Length && char.IsDigit(fuente[i])) i++;
                            if (i == inicioExponente) i = guardado;
                        }
                        double numero;
                        if (!double.TryParse(fuente.Substring(inicio, i - inicio),
                                System.Globalization.NumberStyles.Float,
                                System.Globalization.CultureInfo.InvariantCulture, out numero))
                            throw new FormatException("número mal formado");
                        _simbolos.Add(new Simbolo { Tipo = Tipo.Numero, Numero = numero });
                        continue;
                    }

                    if (char.IsLetter(c))
                    {
                        int inicio = i;
                        while (i < fuente.Length && char.IsLetter(fuente[i])) i++;
                        string palabra = fuente.Substring(inicio, i - inicio);
                        string minuscula = palabra.ToLowerInvariant();
                        int siguiente = i;
                        while (siguiente < fuente.Length && char.IsWhiteSpace(fuente[siguiente])) siguiente++;
                        if (Funciones.ContainsKey(minuscula) && siguiente < fuente.Length && fuente[siguiente] == '(')
                            _simbolos.Add(new Simbolo { Tipo = Tipo.Funcion, Texto = minuscula });
                        else if (palabra.Length == 1 && "BNE".Contains(palabra.ToUpperInvariant()))
                            _simbolos.Add(new Simbolo { Tipo = Tipo.Variable, Texto = palabra.ToUpperInvariant() });
                        else
                            throw new FormatException("símbolo no válido: " + palabra);
                        continue;
                    }

                    if (c == ',') { _simbolos.Add(new Simbolo { Tipo = Tipo.Coma, Texto = "," }); i++; continue; }
                    if (c == '*' && i + 1 < fuente.Length && fuente[i + 1] == '*')
                    {
                        _simbolos.Add(new Simbolo { Tipo = Tipo.Operador, Texto = "^" }); i += 2; continue;
                    }
                    if ("+-*/^".IndexOf(c) >= 0)
                    {
                        _simbolos.Add(new Simbolo { Tipo = Tipo.Operador, Texto = c.ToString() }); i++; continue;
                    }
                    if (c == '(' || c == '[')
                    {
                        _simbolos.Add(new Simbolo { Tipo = Tipo.Apertura, Texto = c.ToString() }); i++; continue;
                    }
                    if (c == ')' || c == ']')
                    {
                        _simbolos.Add(new Simbolo { Tipo = Tipo.Cierre, Texto = c.ToString() }); i++; continue;
                    }
                    throw new FormatException("carácter no válido: " + c);
                }
            }

            private Simbolo Actual() => _posicion < _simbolos.Count ? _simbolos[_posicion] : default(Simbolo);

            private Simbolo Tomar()
            {
                if (_posicion >= _simbolos.Count) throw new FormatException("expresión incompleta");
                return _simbolos[_posicion++];
            }

            private Funcion Expresion()
            {
                Funcion izquierda = Termino();
                while (_posicion < _simbolos.Count && Actual().Tipo == Tipo.Operador &&
                       (Actual().Texto == "+" || Actual().Texto == "-"))
                {
                    string operador = Tomar().Texto;
                    Funcion derecha = Termino();
                    Funcion a = izquierda;
                    izquierda = operador == "+"
                        ? (b, n, e) => a(b, n, e) + derecha(b, n, e)
                        : (b, n, e) => a(b, n, e) - derecha(b, n, e);
                }
                return izquierda;
            }

            private Funcion Termino()
            {
                Funcion izquierda = Unario();
                while (_posicion < _simbolos.Count && Actual().Tipo == Tipo.Operador &&
                       (Actual().Texto == "*" || Actual().Texto == "/"))
                {
                    string operador = Tomar().Texto;
                    Funcion derecha = Unario();
                    Funcion a = izquierda;
                    izquierda = operador == "*"
                        ? (b, n, e) => a(b, n, e) * derecha(b, n, e)
                        : (b, n, e) => a(b, n, e) / derecha(b, n, e);
                }
                return izquierda;
            }

            private Funcion Unario()
            {
                if (_posicion < _simbolos.Count && Actual().Tipo == Tipo.Operador &&
                    (Actual().Texto == "+" || Actual().Texto == "-"))
                {
                    string operador = Tomar().Texto;
                    Funcion a = Unario();
                    return operador == "-" ? (b, n, e) => -a(b, n, e) : a;
                }
                return Potencia();
            }

            private Funcion Potencia()
            {
                Funcion baseFn = Atomico();
                if (_posicion < _simbolos.Count && Actual().Tipo == Tipo.Operador && Actual().Texto == "^")
                {
                    Tomar();
                    Funcion exponente = Unario();
                    return (b, n, e) => Math.Pow(baseFn(b, n, e), exponente(b, n, e));
                }
                return baseFn;
            }

            private Funcion Atomico()
            {
                Simbolo simbolo = Tomar();
                if (simbolo.Tipo == Tipo.Numero)
                {
                    double valor = simbolo.Numero;
                    return (b, n, e) => valor;
                }
                if (simbolo.Tipo == Tipo.Variable)
                {
                    if (simbolo.Texto == "B") return (b, n, e) => b;
                    if (simbolo.Texto == "N") return (b, n, e) => n;
                    return (b, n, e) => e;
                }
                if (simbolo.Tipo == Tipo.Funcion)
                {
                    Simbolo apertura = Tomar();
                    if (apertura.Tipo != Tipo.Apertura || apertura.Texto != "(")
                        throw new FormatException("falta '(' tras la función");
                    var argumentos = new List<Funcion>();
                    if (_posicion < _simbolos.Count && Actual().Tipo != Tipo.Cierre)
                    {
                        argumentos.Add(Expresion());
                        while (_posicion < _simbolos.Count && Actual().Tipo == Tipo.Coma)
                        {
                            Tomar();
                            argumentos.Add(Expresion());
                        }
                    }
                    Simbolo cierre = Tomar();
                    if (cierre.Tipo != Tipo.Cierre || cierre.Texto != ")")
                        throw new FormatException("función sin cerrar");
                    Funcion[] args = argumentos.ToArray();
                    Func<double[], double> funcion = Funciones[simbolo.Texto];
                    return (b, n, e) =>
                    {
                        var valores = new double[args.Length];
                        for (int i = 0; i < args.Length; i++) valores[i] = args[i](b, n, e);
                        return funcion(valores);
                    };
                }
                if (simbolo.Tipo == Tipo.Apertura)
                {
                    Funcion interna = Expresion();
                    Simbolo cierre = Tomar();
                    string esperado = simbolo.Texto == "(" ? ")" : "]";
                    if (cierre.Tipo != Tipo.Cierre || cierre.Texto != esperado)
                        throw new FormatException("agrupación sin cerrar");
                    return interna;
                }
                throw new FormatException("símbolo inesperado");
            }
        }
    }
}
