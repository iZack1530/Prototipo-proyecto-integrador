using System;

namespace HorizonMythos.Nucleo.Aleatorio
{
    /// <summary>
    /// Generador determinista xmur3 + mulberry32, idéntico al del Laboratorio JS.
    /// La semilla textual se transforma con xmur3 y su primera salida es el estado inicial.
    /// </summary>
    public sealed class Rng
    {
        private int _estado;

        public Rng(string semilla)
        {
            _estado = Xmur3(semilla ?? string.Empty);
        }

        /// <summary>Estado interno de 32 bits con signo; útil para depurar una repetición.</summary>
        public int Estado => _estado;

        /// <summary>Hash xmur3 de una cadena (xmur3(texto)()).</summary>
        public static int Xmur3(string texto)
        {
            if (texto == null) texto = string.Empty;

            unchecked
            {
                int h = 1779033703 ^ texto.Length;
                for (int i = 0; i < texto.Length; i++)
                {
                    h = Imul(h ^ texto[i], (int)3432918353u);
                    h = (h << 13) | ((int)((uint)h >> 19));
                }

                h = Imul(h ^ ((int)((uint)h >> 16)), (int)2246822507u);
                h = Imul(h ^ ((int)((uint)h >> 13)), (int)3266489909u);
                h ^= (int)((uint)h >> 16);
                return h;
            }
        }

        /// <summary>Siguiente número en [0, 1), con la misma secuencia que rng() en JS.</summary>
        public double Siguiente()
        {
            unchecked
            {
                _estado += unchecked((int)0x6D2B79F5);
                int t = _estado;
                t = Imul(t ^ ((int)((uint)t >> 15)), t | 1);
                t ^= t + Imul(t ^ ((int)((uint)t >> 7)), t | 61);
                uint salida = (uint)(t ^ ((int)((uint)t >> 14)));
                return salida / 4294967296.0;
            }
        }

        /// <summary>Equivalente a Math.imul: multiplicación entera de 32 bits.</summary>
        private static int Imul(int a, int b) => unchecked(a * b);
    }
}
