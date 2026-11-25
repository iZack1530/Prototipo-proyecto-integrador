using System;
using System.Collections.Generic;
using System.Linq;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Nucleo.Formatos
{
    /// <summary>Valida una lista de identificadores de equipo contra un formato y un catálogo.</summary>
    public static class ValidadorEquipo
    {
        /// <summary>Devuelve los problemas encontrados; vacío cuando el equipo es válido.</summary>
        public static IReadOnlyList<string> Validar(Catalogo catalogo, IReadOnlyList<string> equipo,
            Formato formato, string nombreEquipo = "Equipo")
        {
            var errores = new List<string>();
            if (equipo == null) return new List<string> { nombreEquipo + ": falta el equipo" };

            if (formato.ExigirTamano && equipo.Count < formato.TamanoEquipo)
                errores.Add(nombreEquipo + ": se necesitan " + formato.TamanoEquipo +
                    " criaturas, solo hay " + equipo.Count);
            if (formato.ExigirTamano && equipo.Count > formato.TamanoEquipo)
                errores.Add(nombreEquipo + ": hay " + equipo.Count +
                    " criaturas, el máximo es " + formato.TamanoEquipo);

            foreach (string id in equipo.Distinct())
                if (catalogo.ObtenerCriatura(id) == null)
                    errores.Add(nombreEquipo + ": criatura desconocida «" + id + "»");

            Criatura[] conocidas = equipo.Select(catalogo.ObtenerCriatura).Where(c => c != null).ToArray();
            if (conocidas.Any(c => c.Nivel > formato.NivelMaximo))
                errores.Add(nombreEquipo + ": supera el nivel máximo " + formato.NivelMaximo);

            if (formato.TieneClausula("sin-repetir-especie"))
            {
                var repetidas = conocidas.GroupBy(c => c.Especie).Where(g => g.Count() > 1)
                    .Select(g => g.Key).ToArray();
                if (repetidas.Length > 0)
                    errores.Add(nombreEquipo + ": especie repetida «" + string.Join(", ", repetidas) + "»");
            }

            foreach (string id in formato.Prohibidos)
                if (equipo.Contains(id))
                    errores.Add(nombreEquipo + ": «" + id + "» está prohibido en " + formato.Nombre);

            return errores;
        }
    }
}
