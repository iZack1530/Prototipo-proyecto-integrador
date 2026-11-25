namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Estadísticas finales de una criatura, ya calculadas con sus fórmulas.</summary>
    public sealed class Estadisticas
    {
        public double Hp { get; set; }
        public double Mp { get; set; }
        public double Atk { get; set; }
        public double Def { get; set; }
        public double MAtk { get; set; }
        public double MDef { get; set; }
        public double Spd { get; set; }

        public double Obtener(string clave)
        {
            switch (clave)
            {
                case "hp": return Hp;
                case "mp": return Mp;
                case "atk": return Atk;
                case "def": return Def;
                case "matk": return MAtk;
                case "mdef": return MDef;
                case "spd": return Spd;
                default: return 1;
            }
        }

        public void Asignar(string clave, double valor)
        {
            switch (clave)
            {
                case "hp": Hp = valor; break;
                case "mp": Mp = valor; break;
                case "atk": Atk = valor; break;
                case "def": Def = valor; break;
                case "matk": MAtk = valor; break;
                case "mdef": MDef = valor; break;
                case "spd": Spd = valor; break;
            }
        }
    }
}
