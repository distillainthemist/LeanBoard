import { describe, expect, it } from "vitest";
import { bytesFromConnector, describeAnswer } from "../docs/connectorBytes";

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0xe2, 0xe3, 0xcf, 0xd3, 0x00, 0xff];
const bytes = new Uint8Array(PDF);
const binaryString = String.fromCharCode(...PDF);
const base64 = btoa(binaryString);

// N4 (2026-11-26): the connector answered a PDF "as string, not bytes".
describe("a file's bytes, in whatever shape the connector gave them", () => {
  it("takes bytes as they are", () => {
    expect(bytesFromConnector(bytes, "%PDF")).toBe(bytes);
    expect(Array.from(bytesFromConnector(bytes.buffer.slice(0), "%PDF") ?? [])).toEqual(PDF);
  });
  it("reads a binary string back byte for byte, high bytes included", () => {
    expect(Array.from(bytesFromConnector(binaryString, "%PDF") ?? [])).toEqual(PDF);
  });
  it("reads a base64 string", () => {
    expect(Array.from(bytesFromConnector(base64, "%PDF") ?? [])).toEqual(PDF);
  });
  it("refuses a string that is not the file it should be", () => {
    expect(bytesFromConnector("<html>Sign in</html>", "%PDF")).toBeNull();
    expect(bytesFromConnector('{"error":"not found"}', "%PDF")).toBeNull();
  });
  it("refuses a string that was decoded as text (a character past one byte)", () => {
    expect(bytesFromConnector("%PDF-1.7\n��", "%PDF")).toBeNull();
  });
  it("refuses nothing at all", () => {
    expect(bytesFromConnector("", "%PDF")).toBeNull();
    expect(bytesFromConnector(new Uint8Array(0), "%PDF")).toBeNull();
    expect(bytesFromConnector(undefined, "%PDF")).toBeNull();
    expect(bytesFromConnector({ value: 1 }, "%PDF")).toBeNull();
  });
  it("describes an answer it could not use, without spilling it", () => {
    expect(describeAnswer("<html>\u0000Sign in")).toBe('a string of 14 characters beginning "<html>?S"');
    expect(describeAnswer(undefined)).toBe("nothing");
    expect(describeAnswer(42)).toBe("a number");
  });
});
