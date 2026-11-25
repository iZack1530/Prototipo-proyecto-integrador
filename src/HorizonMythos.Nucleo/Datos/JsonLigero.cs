using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace HorizonMythos.Nucleo.Datos
{
    /// <summary>
    /// Lector JSON mínimo (objetos, listas, cadenas, números, booleanos y null).
    /// Evita añadir paquetes NuGet al Núcleo, que debe compilar en netstandard2.1 sin dependencias.
    /// </summary>
    public static class JsonLigero
    {
        public static object Analizar(string texto)
        {
            var lector = new Lector(texto ?? string.Empty);
            object valor = lector.LeerValor();
            lector.SaltarEspacios();
            if (!lector.Final) throw new FormatException("sobra contenido tras el JSON");
            return valor;
        }

        public static Dictionary<string, object> ComoObjeto(object valor) => valor as Dictionary<string, object>;

        public static List<object> ComoLista(object valor) => valor as List<object>;

        public static object Obtener(object valor, string clave)
        {
            var objeto = ComoObjeto(valor);
            object encontrado;
            return objeto != null && objeto.TryGetValue(clave, out encontrado) ? encontrado : null;
        }

        public static string Texto(object valor, string defecto = "")
        {
            return valor is string ? (string)valor : defecto;
        }

        public static double Numero(object valor, double defecto = 0)
        {
            if (valor is double) return (double)valor;
            if (valor is long) return (long)valor;
            if (valor is int) return (int)valor;
            double resultado;
            return double.TryParse(Convert.ToString(valor, CultureInfo.InvariantCulture),
                NumberStyles.Float, CultureInfo.InvariantCulture, out resultado) ? resultado : defecto;
        }

        public static int Entero(object valor, int defecto = 0) => (int)Math.Round(Numero(valor, defecto));

        public static bool Booleano(object valor, bool defecto = false)
        {
            return valor is bool ? (bool)valor : defecto;
        }

        public static IReadOnlyList<object> Lista(object valor)
        {
            return ComoLista(valor) ?? new List<object>();
        }

        public static IReadOnlyList<string> Textos(object valor)
        {
            var resultado = new List<string>();
            foreach (object item in Lista(valor))
            {
                string texto = Texto(item);
                if (!string.IsNullOrEmpty(texto)) resultado.Add(texto);
            }
            return resultado;
        }

        private sealed class Lector
        {
            private readonly string _texto;
            private int _posicion;

            public Lector(string texto) { _texto = texto; }

            public bool Final => _posicion >= _texto.Length;

            public void SaltarEspacios()
            {
                while (_posicion < _texto.Length && char.IsWhiteSpace(_texto[_posicion])) _posicion++;
            }

            public object LeerValor()
            {
                SaltarEspacios();
                if (Final) throw new FormatException("JSON incompleto");
                char c = _texto[_posicion];
                if (c == '{') return LeerObjeto();
                if (c == '[') return LeerLista();
                if (c == '"') return LeerCadena();
                if (c == 't') { LeerLiteral("true"); return true; }
                if (c == 'f') { LeerLiteral("false"); return false; }
                if (c == 'n') { LeerLiteral("null"); return null; }
                return LeerNumero();
            }

            private void LeerLiteral(string literal)
            {
                if (_posicion + literal.Length > _texto.Length ||
                    string.CompareOrdinal(_texto, _posicion, literal, 0, literal.Length) != 0)
                    throw new FormatException("literal no válido");
                _posicion += literal.Length;
            }

            private Dictionary<string, object> LeerObjeto()
            {
                _posicion++;
                var objeto = new Dictionary<string, object>();
                SaltarEspacios();
                if (!Final && _texto[_posicion] == '}') { _posicion++; return objeto; }
                while (true)
                {
                    SaltarEspacios();
                    if (Final || _texto[_posicion] != '"') throw new FormatException("se esperaba una clave");
                    string clave = LeerCadena();
                    SaltarEspacios();
                    if (Final || _texto[_posicion] != ':') throw new FormatException("se esperaba ':'");
                    _posicion++;
                    objeto[clave] = LeerValor();
                    SaltarEspacios();
                    if (Final) throw new FormatException("objeto sin cerrar");
                    if (_texto[_posicion] == '}') { _posicion++; return objeto; }
                    if (_texto[_posicion] != ',') throw new FormatException("se esperaba ','");
                    _posicion++;
                }
            }

            private List<object> LeerLista()
            {
                _posicion++;
                var lista = new List<object>();
                SaltarEspacios();
                if (!Final && _texto[_posicion] == ']') { _posicion++; return lista; }
                while (true)
                {
                    lista.Add(LeerValor());
                    SaltarEspacios();
                    if (Final) throw new FormatException("lista sin cerrar");
                    if (_texto[_posicion] == ']') { _posicion++; return lista; }
                    if (_texto[_posicion] != ',') throw new FormatException("se esperaba ','");
                    _posicion++;
                }
            }

            private string LeerCadena()
            {
                _posicion++;
                var cadena = new StringBuilder();
                while (_posicion < _texto.Length)
                {
                    char c = _texto[_posicion++];
                    if (c == '"') return cadena.ToString();
                    if (c != '\\') { cadena.Append(c); continue; }
                    if (_posicion >= _texto.Length) throw new FormatException("escape incompleto");
                    char escape = _texto[_posicion++];
                    switch (escape)
                    {
                        case '"': cadena.Append('"'); break;
                        case '\\': cadena.Append('\\'); break;
                        case '/': cadena.Append('/'); break;
                        case 'b': cadena.Append('\b'); break;
                        case 'f': cadena.Append('\f'); break;
                        case 'n': cadena.Append('\n'); break;
                        case 'r': cadena.Append('\r'); break;
                        case 't': cadena.Append('\t'); break;
                        case 'u':
                            if (_posicion + 4 > _texto.Length) throw new FormatException("unicode incompleto");
                            int codigo;
                            if (!int.TryParse(_texto.Substring(_posicion, 4), NumberStyles.HexNumber,
                                    CultureInfo.InvariantCulture, out codigo))
                                throw new FormatException("unicode no válido");
                            cadena.Append((char)codigo);
                            _posicion += 4;
                            break;
                        default: throw new FormatException("escape desconocido");
                    }
                }
                throw new FormatException("cadena sin cerrar");
            }

            private double LeerNumero()
            {
                int inicio = _posicion;
                if (_texto[_posicion] == '-' || _texto[_posicion] == '+') _posicion++;
                while (_posicion < _texto.Length && char.IsDigit(_texto[_posicion])) _posicion++;
                if (_posicion < _texto.Length && _texto[_posicion] == '.')
                {
                    _posicion++;
                    while (_posicion < _texto.Length && char.IsDigit(_texto[_posicion])) _posicion++;
                }
                if (_posicion < _texto.Length && (_texto[_posicion] == 'e' || _texto[_posicion] == 'E'))
                {
                    _posicion++;
                    if (_posicion < _texto.Length && (_texto[_posicion] == '+' || _texto[_posicion] == '-')) _posicion++;
                    while (_posicion < _texto.Length && char.IsDigit(_texto[_posicion])) _posicion++;
                }
                double numero;
                if (!double.TryParse(_texto.Substring(inicio, _posicion - inicio),
                        NumberStyles.Float, CultureInfo.InvariantCulture, out numero))
                    throw new FormatException("número no válido");
                return numero;
            }
        }
    }
}
