using Microsoft.AspNetCore.Mvc;

namespace SecretRecorder.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecordingsController : ControllerBase
    {
        private readonly string _storageDir;

        public RecordingsController(IWebHostEnvironment env)
        {
            _storageDir = Path.Combine(env.ContentRootPath, "Recordings");
            if (!Directory.Exists(_storageDir)) Directory.CreateDirectory(_storageDir);
        }

        [HttpPost("upload")]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");
            var safeName = Path.GetFileNameWithoutExtension(file.FileName);
            var ext = Path.GetExtension(file.FileName);
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var unique = $"{safeName}_{timestamp}{ext}";
            var path = Path.Combine(_storageDir, unique);
            await using var stream = System.IO.File.Create(path);
            await file.CopyToAsync(stream);
            return Ok(new { filename = unique });
        }

        [HttpGet("list")]
        public IActionResult List()
        {
            var files = Directory.GetFiles(_storageDir)
                .Select(f => new {
                    name = Path.GetFileName(f),
                    url = Url.Action("Download", new { name = Path.GetFileName(f) })
                })
                .OrderByDescending(f => f.name)
                .ToList();
            return Ok(files);
        }

        [HttpGet("download")]
        public IActionResult Download(string name)
        {
            if (string.IsNullOrEmpty(name)) return BadRequest();
            var path = Path.Combine(_storageDir, name);
            if (!System.IO.File.Exists(path)) return NotFound();
            var mime = "audio/webm"; // default
            if (Path.GetExtension(name).Equals(".wav", StringComparison.OrdinalIgnoreCase)) mime = "audio/wav";
            return PhysicalFile(path, mime, name);
        }
    }
}
