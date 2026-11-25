using System.Net;
using System.Net.Mail;

namespace HorizonMythos.Servidor.Api.Cuentas;

/// <summary>Envío de correo. Si no hay SMTP configurado, el mensaje solo se registra (desarrollo).</summary>
public interface IEnvioCorreo
{
    Task EnviarAsync(string destino, string asunto, string cuerpo, CancellationToken cancelacion = default);
}

public sealed class EnvioCorreoSmtp : IEnvioCorreo
{
    private readonly IConfiguration _configuracion;
    private readonly ILogger<EnvioCorreoSmtp> _registro;

    public EnvioCorreoSmtp(IConfiguration configuracion, ILogger<EnvioCorreoSmtp> registro)
    {
        _configuracion = configuracion;
        _registro = registro;
    }

    public async Task EnviarAsync(string destino, string asunto, string cuerpo,
        CancellationToken cancelacion = default)
    {
        string? host = _configuracion["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            _registro.LogWarning("SMTP sin configurar; se omite el envío a {Destino} con asunto «{Asunto}».",
                destino, asunto);
            return;
        }

        int puerto = _configuracion.GetValue("Smtp:Puerto", 587);
        string remitente = _configuracion["Smtp:Remitente"] ?? _configuracion["Smtp:Usuario"] ?? "no-reply@localhost";
        bool usarSsl = _configuracion.GetValue("Smtp:UsarSsl", true);
        string? usuario = _configuracion["Smtp:Usuario"];
        string? contrasena = _configuracion["Smtp:Contrasena"];

        using var mensaje = new MailMessage(remitente, destino, asunto, cuerpo);
        using var cliente = new SmtpClient(host, puerto)
        {
            EnableSsl = usarSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };
        if (!string.IsNullOrWhiteSpace(usuario))
            cliente.Credentials = new NetworkCredential(usuario, contrasena);

        await cliente.SendMailAsync(mensaje, cancelacion);
    }
}
