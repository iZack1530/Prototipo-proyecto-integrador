using System.Security.Cryptography;
using System.Text;

namespace HorizonMythos.Servidor.Api.Cuentas;

/// <summary>Hash de contraseñas con PBKDF2-SHA256; formato "pbkdf2-sha256$iteraciones$sal$hash".</summary>
public static class HashContrasena
{
    private const int Iteraciones = 120_000;
    private const int LongitudSal = 16;
    private const int LongitudHash = 32;

    public static string Crear(string contrasena)
    {
        if (string.IsNullOrWhiteSpace(contrasena)) throw new ArgumentException("La contraseña es obligatoria");
        byte[] sal = RandomNumberGenerator.GetBytes(LongitudSal);
        byte[] hash = Derivar(contrasena, sal, Iteraciones);
        return $"pbkdf2-sha256${Iteraciones}${Convert.ToBase64String(sal)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verificar(string contrasena, string? almacenado)
    {
        if (string.IsNullOrWhiteSpace(contrasena) || string.IsNullOrWhiteSpace(almacenado)) return false;
        string[] partes = almacenado.Split('$');
        if (partes.Length != 4 || partes[0] != "pbkdf2-sha256") return false;
        if (!int.TryParse(partes[1], out int iteraciones) || iteraciones <= 0) return false;
        try
        {
            byte[] sal = Convert.FromBase64String(partes[2]);
            byte[] esperado = Convert.FromBase64String(partes[3]);
            byte[] obtenido = Derivar(contrasena, sal, iteraciones);
            return CryptographicOperations.FixedTimeEquals(obtenido, esperado);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static byte[] Derivar(string contrasena, byte[] sal, int iteraciones)
    {
        return Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(contrasena), sal,
            iteraciones, HashAlgorithmName.SHA256, LongitudHash);
    }
}
