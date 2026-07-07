// AtoA on-device OCR helper.
// Usage: atoa-ocr <image-path>  → recognized text lines on stdout.
// Uses Apple Vision — nothing ever leaves the machine.

import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count > 1 else {
    FileHandle.standardError.write("usage: atoa-ocr <image>\n".data(using: .utf8)!)
    exit(2)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let image = NSImage(contentsOf: url),
      let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
    FileHandle.standardError.write("could not read image\n".data(using: .utf8)!)
    exit(3)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["ja-JP", "en-US"]
request.usesLanguageCorrection = true

do {
    try VNImageRequestHandler(cgImage: cg).perform([request])
} catch {
    FileHandle.standardError.write("ocr failed: \(error.localizedDescription)\n".data(using: .utf8)!)
    exit(4)
}

let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
print(lines.joined(separator: "\n"))
