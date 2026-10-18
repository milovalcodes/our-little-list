"""Prepare the selected CC BY 4.0 clips from an official downloaded archive.

Usage: python scripts/prepare-interface-audio.py PATH/TO/UI\ Soundpack
No archive or dependency download is performed by this script.
"""
import audioop
import hashlib
import json
from pathlib import Path
import struct
import sys
import wave

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'audio' / 'interface'
target.mkdir(parents=True, exist_ok=True)
selection = {
    'tap-1': 'Minimalist1', 'tap-2': 'Minimalist2',
    'open': 'Modern2', 'close': 'Modern3',
    'save': 'Modern14', 'found': 'Modern10', 'solve': 'African4',
    'notice': 'African2', 'invalid': 'Coffee2',
    'on': 'Wood Block1', 'off': 'Wood Block2', 'navigate': 'Minimalist4',
}
manifest = []
for name, original in selection.items():
    path = source / 'WAV' / (original + '.wav')
    with wave.open(str(path), 'rb') as clip:
        assert clip.getsampwidth() == 2 and clip.getcomptype() == 'NONE'
        channels, rate = clip.getnchannels(), clip.getframerate()
        pcm = clip.readframes(clip.getnframes())
    if channels == 2:
        pcm = audioop.tomono(pcm, 2, .5, .5)
    pcm, _ = audioop.ratecv(pcm, 2, 1, rate, 22050, None)
    samples = list(struct.unpack('<' + 'h' * (len(pcm) // 2), pcm))
    peak = max(abs(v) for v in samples)
    audible = [i for i, v in enumerate(samples) if abs(v) > max(16, peak * .003)]
    assert audible, original
    samples = samples[max(0, audible[0] - 176):min(len(samples), audible[-1] + 1103)]
    assert len(samples) / 22050 < 2, 'Unexpected long effect: ' + original
    # Consistent peak ceiling; short fades prevent clicks after trimming silence.
    gain = 18000 / peak
    samples = [round(v * gain * min(1, i / 110, (len(samples)-1-i) / 441)) for i, v in enumerate(samples)]
    output = target / (name + '.wav')
    with wave.open(str(output), 'wb') as clip:
        clip.setparams((1, 2, 22050, 0, 'NONE', 'not compressed'))
        clip.writeframes(struct.pack('<' + 'h' * len(samples), *samples))
    manifest.append({'file': name+'.wav', 'original': 'WAV/'+original+'.wav', 'seconds': round(len(samples)/22050, 3), 'bytes': output.stat().st_size, 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()})
(target / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
(target / 'LICENSE.txt').write_text((source / 'readme.txt').read_text(encoding='utf-8')+'\nAdapted for Our Little List: converted to mono 22.05 kHz WAV, silence trimmed, peak level adjusted, and short edge fades applied.\nSource: https://cyrex-studios.itch.io/universal-ui-soundpack\nLicense: https://creativecommons.org/licenses/by/4.0/\n', encoding='utf-8')
print(json.dumps({'clips': len(manifest), 'bytes': sum(m['bytes'] for m in manifest), 'durations': {m['file']: m['seconds'] for m in manifest}}))
