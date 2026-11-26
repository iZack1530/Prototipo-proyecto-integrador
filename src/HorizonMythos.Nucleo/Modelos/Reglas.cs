using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Constantes de reglas compartidas por el cargador y el motor de combate.</summary>
    public static class Reglas
    {
        public static readonly string[] ClavesEstadistica = { "hp", "mp", "atk", "def", "matk", "mdef", "spd" };

        public static readonly string FormulaVida = "((310 * B^0.5) + ((E / 8) * 25) * N / 100) + 100 + (N * 2)";
        public static readonly string FormulaManana = "B + N * 2 + 50";
        public static readonly string FormulaStat = "[((B * 2 / 5) + (E / 16)) / 2] * N + 50 + N";

        public static string FormulaPorDefecto(string clave)
        {
            return clave == "hp" ? FormulaVida : clave == "mp" ? FormulaManana : FormulaStat;
        }

        public static readonly Dictionary<int, double> MultiplicadoresBoost = new Dictionary<int, double>
        {
            { -4, 0.45 }, { -3, 0.55 }, { -2, 0.65 }, { -1, 0.8 },
            { 1, 1.25 }, { 2, 1.5 }, { 3, 1.75 }, { 4, 2 }
        };

        public static readonly Dictionary<string, double> Criticos = new Dictionary<string, double>
        {
            { "bajo", 5 }, { "medio", 7.5 }, { "alto", 12.5 }
        };

        public static readonly Dictionary<string, Dictionary<string, double>> Estados =
            new Dictionary<string, Dictionary<string, double>>
            {
                { "Quemadura", new Dictionary<string, double> { { "def", 0.85 }, { "tick", 0.075 } } },
                { "Parálisis", new Dictionary<string, double> { { "spd", 0.85 } } },
                { "Intoxicación", new Dictionary<string, double> { { "atk", 0.85 }, { "tick", 0.075 } } },
                { "Congelación", new Dictionary<string, double> { { "spd", 0.9 }, { "def", 0.9 }, { "mdef", 0.9 } } },
                { "Maldición", new Dictionary<string, double> { { "matk", 0.8 } } },
                { "Sangrado", new Dictionary<string, double> { { "atk", 0.9 }, { "def", 0.9 }, { "tick", 0.05 } } },
            };

        public static readonly Dictionary<string, string> AliasEstados = new Dictionary<string, string>
        {
            { "Envenenamiento", "Intoxicación" }
        };

        public static readonly Dictionary<string, Dictionary<string, double>> ObjetosPasivos =
            new Dictionary<string, Dictionary<string, double>>
            {
                { "Cinto Férreo", new Dictionary<string, double> { { "def", 1.1 }, { "mdef", 1.1 } } },
                { "Amuleto Veloz", new Dictionary<string, double> { { "spd", 1.1 } } },
            };

        public static readonly Dictionary<string, Dictionary<string, double>> ObjetosOfensivos =
            new Dictionary<string, Dictionary<string, double>>
            {
                { "Lente de Poder", new Dictionary<string, double> { { "all", 1.1 } } },
                { "Garra Afilada", new Dictionary<string, double> { { "fis", 1.2 } } },
                { "Orbe Arcano", new Dictionary<string, double> { { "mag", 1.2 } } },
            };

        public static readonly Dictionary<string, Dictionary<string, double>> Consumibles =
            new Dictionary<string, Dictionary<string, double>>
            {
                { "Poción", new Dictionary<string, double> { { "tipo", 0 }, { "potencia", 30 } } },
                { "Éter", new Dictionary<string, double> { { "tipo", 1 }, { "potencia", 30 } } },
                { "Antídoto", new Dictionary<string, double> { { "tipo", 2 }, { "potencia", 0 } } },
            };

        public static readonly Dictionary<string, int> MochilaInicial = new Dictionary<string, int>
        {
            { "Poción", 3 }, { "Éter", 2 }, { "Antídoto", 2 }
        };

        public static readonly double[] ReduccionGuardia = { 0.1, 0.5, 0.8 };

        public static readonly Dictionary<string, Clima> Climas = new Dictionary<string, Clima>
        {
            { "ob", new Clima("Tormenta de Obsidiana", new Dictionary<string, double> { { "Tierra", 1.2 } }) },
            { "cy", new Clima("Ciclón Tropical", new Dictionary<string, double> { { "Agua", 1.2 }, { "Fuego", 0.8 } },
                new Dictionary<string, double> { { "Planta", 1.1 } }) },
            { "ne", new Clima("Neblina", null, new Dictionary<string, double> { { "Oscuro", 1.25 } }) },
            { "so", new Clima("Soleado", new Dictionary<string, double> { { "Fuego", 1.2 }, { "Agua", 0.8 } },
                new Dictionary<string, double> { { "Oscuro", 0.9 } }) },
            { "gr", new Clima("Granizo", new Dictionary<string, double> { { "Hielo", 1.2 } },
                new Dictionary<string, double> { { "Hielo", 1.1 }, { "Planta", 0.9 } }) },
            { "oj", new Clima("Ojo de Tormenta", new Dictionary<string, double> { { "Viento", 1.2 } }, null,
                new Dictionary<string, double> { { "Viento", 1.1 } }) },
        };

        public static double MultiplicadorBoost(int nivel)
        {
            double valor;
            return MultiplicadoresBoost.TryGetValue(nivel, out valor) ? valor : 1;
        }

        public static double MultiplicadorEstado(string estado, string clave)
        {
            Dictionary<string, double> valores;
            if (estado == null || !Estados.TryGetValue(estado, out valores)) return 1;
            double valor;
            return valores.TryGetValue(clave, out valor) ? valor : 1;
        }

        /// <summary>Coste de MP: −10 % (con mínimo 1) si el usuario comparte el tipo del ataque.</summary>
        public static int Coste(IReadOnlyList<string> tipos, int mp, string tipoAtaque)
        {
            if (mp <= 0) return mp;
            return Contiene(tipos, tipoAtaque)
                ? System.Math.Max(1, (int)System.Math.Floor(mp * 0.9))
                : mp;
        }

        public static int Coste(IReadOnlyList<string> tipos, Ataque ataque)
        {
            return ataque == null ? 0 : Coste(tipos, ataque.Mp, ataque.Tipo);
        }

        public static bool Contiene(IReadOnlyList<string> lista, string valor)
        {
            if (lista == null || valor == null) return false;
            for (int i = 0; i < lista.Count; i++) if (lista[i] == valor) return true;
            return false;
        }
    }

    /// <summary>Modificadores climáticos por tipo, equivalentes a WEA del Laboratorio.</summary>
    public sealed class Clima
    {
        public Clima(string nombre, IReadOnlyDictionary<string, double> dano = null,
            IReadOnlyDictionary<string, double> defensa = null, IReadOnlyDictionary<string, double> velocidad = null)
        {
            Nombre = nombre;
            Dano = dano ?? new Dictionary<string, double>();
            Defensa = defensa ?? new Dictionary<string, double>();
            Velocidad = velocidad ?? new Dictionary<string, double>();
        }

        public string Nombre { get; }
        public IReadOnlyDictionary<string, double> Dano { get; }
        public IReadOnlyDictionary<string, double> Defensa { get; }
        public IReadOnlyDictionary<string, double> Velocidad { get; }
    }
}
