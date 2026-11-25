using System;
using System.Globalization;

namespace HorizonMythos.Nucleo.Combate
{
    /// <summary>Formato numérico y etiquetas de los mensajes del motor, iguales a los de JS.</summary>
    internal static class TextosCombate
    {
        public static string Num(double valor) => valor.ToString("0.############", CultureInfo.InvariantCulture);

        public static string Fijo(double valor, int decimales) =>
            valor.ToString("F" + decimales, CultureInfo.InvariantCulture);

        public static string NumRedondeado(double valor, int decimales) =>
            Num(System.Math.Round(valor, decimales, MidpointRounding.AwayFromZero));

        public static string Categoria(string categoria)
        {
            switch (categoria)
            {
                case "fis": return "Daño Físico";
                case "mag": return "Daño Mágico";
                default: return "Estado";
            }
        }

        public static string Efecto(string clave)
        {
            switch (clave)
            {
                case "boost": return "Boosteo de stat";
                case "lifesteal": return "Robo de vida";
                case "mpsteal": return "Robo de maná";
                case "recoil": return "Retroceso";
                case "status": return "Estado alterado";
                case "guard": return "Reducción de daño recibido";
                case "pivot": return "Pivote (cambio al impactar)";
                case "trap": return "Impedir retirada del rival (3–5 turnos)";
                default: return clave;
            }
        }

        public static string Reduccion(string tipo)
        {
            switch (tipo)
            {
                case "fis": return "físico";
                case "mag": return "mágico";
                case "cont": return "contacto";
                case "area": return "área";
                default: return "todo tipo";
            }
        }
    }
}
