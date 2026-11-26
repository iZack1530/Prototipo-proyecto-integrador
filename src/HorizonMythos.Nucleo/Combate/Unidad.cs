using System.Collections.Generic;
using System.Linq;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Nucleo.Combate
{
    /// <summary>Estado mutable de una criatura dentro de una batalla.</summary>
    public sealed class Unidad
    {
        public Unidad(Catalogo catalogo, Criatura criatura, string pasivo, string ofensivo, int lado, int indice)
        {
            Lado = lado;
            Indice = indice;
            Criatura = criatura;
            Id = criatura.Id;
            Nombre = criatura.Nombre;
            Tipos = criatura.Tipos;
            Nivel = criatura.Nivel;
            Estadisticas = criatura.CalcularEstadisticas(catalogo, pasivo);
            BaseVida = (int)Estadisticas.Hp;
            MaxHp = BaseVida;
            Hp = BaseVida;
            MaxMp = (int)Estadisticas.Mp;
            Mp = MaxMp;
            Pasivo = pasivo ?? "";
            Ofensivo = ofensivo ?? "";
            Habilidad = catalogo.ObtenerHabilidad(criatura);
            HabilidadNombre = Habilidad == null ? "" : Habilidad.Nombre;
            Ab = Habilidad == null
                ? new List<Efecto>()
                : Habilidad.Efectos.Where(f => !(f.Clave == "low" || f.Clave == "dbl") || f.Texto("s") != "HP").ToList();
            Movimientos = criatura.Ataques.Select(catalogo.ObtenerAtaque).Where(m => m != null).ToList();

            Bo = new Dictionary<string, int>
            {
                { "HP", 0 }, { "ATK", 0 }, { "DEF", 0 }, { "MATK", 0 }, { "MDEF", 0 }, { "SPD", 0 }
            };
        }

        public int Lado { get; }
        public int Indice { get; }
        public Criatura Criatura { get; }
        public string Id { get; }
        public string Nombre { get; }
        public IReadOnlyList<string> Tipos { get; }
        public int Nivel { get; }
        public Estadisticas Estadisticas { get; }
        public int BaseVida { get; }
        public int MaxHp { get; set; }
        public int Hp { get; set; }
        public int MaxMp { get; }
        public int Mp { get; set; }
        public Dictionary<string, int> Bo { get; }
        public string Estado { get; set; }
        public int Trampa { get; set; }
        public bool TrampaNueva { get; set; }
        public int Gc { get; set; }
        public int Cd { get; set; }
        public int Gl { get; set; }
        public int Gmp { get; set; }
        public bool Recuperando { get; set; }
        public bool Bloqueado { get; set; }
        public bool KO { get; set; }
        public bool Protegido { get; set; }
        public bool UltimaGuardia { get; set; }
        public bool Primero { get; set; } = true;
        public string Pasivo { get; }
        public string Ofensivo { get; }
        public Habilidad Habilidad { get; }
        public string HabilidadNombre { get; }
        public IReadOnlyList<Efecto> Ab { get; }
        public List<Ataque> Movimientos { get; }
        public List<Guardia> Guardias { get; set; } = new List<Guardia>();
        public Dictionary<int, bool> BajoVida { get; } = new Dictionary<int, bool>();
        public int Real { get; set; }
        public double TiposEfectividad { get; set; } = 1;

        public Dictionary<string, int> CopiaBoosts() => new Dictionary<string, int>(Bo);

        /// <summary>Equivale al estado de snaps del Laboratorio (hp, mx, mp, mm, ko, st, bo, tr, gc, cd, pr, rc).</summary>
        public UnidadEstado ObtenerEstado()
        {
            return new UnidadEstado
            {
                Hp = Hp,
                Mx = MaxHp,
                Mp = Mp,
                Mm = MaxMp,
                Ko = KO,
                St = Estado,
                Bo = CopiaBoosts(),
                Tr = Trampa,
                Gc = Gc,
                Cd = Cd,
                Pr = Protegido,
                Rc = Recuperando
            };
        }
    }

    /// <summary>Reducción de daño aplicada durante un turno.</summary>
    public sealed class Guardia
    {
        public Guardia(double valor, string tipo)
        {
            Valor = valor;
            Tipo = tipo;
        }

        public double Valor { get; }
        public string Tipo { get; }
    }

    public sealed class UnidadEstado
    {
        public int Hp { get; set; }
        public int Mx { get; set; }
        public int Mp { get; set; }
        public int Mm { get; set; }
        public bool Ko { get; set; }
        public string St { get; set; }
        public Dictionary<string, int> Bo { get; set; }
        public int Tr { get; set; }
        public int Gc { get; set; }
        public int Cd { get; set; }
        public bool Pr { get; set; }
        public bool Rc { get; set; }
    }

    public sealed class EstadoCombate
    {
        public int N { get; set; }
        public string W { get; set; }
        public int[][] A { get; set; }
        public UnidadEstado[][] U { get; set; }
    }
}
