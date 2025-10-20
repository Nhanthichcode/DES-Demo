// des.js — DES chuẩn single-block (64-bit) — trả về steps 16 vòng
const DES = (() => {
  const IP = [
    58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46,
    38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8, 57, 49, 41, 33, 25, 17, 9,
    1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47,
    39, 31, 23, 15, 7,
  ];
  const FP = [
    40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14,
    54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29, 36, 4, 44, 12, 52, 20, 60,
    28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41,
    9, 49, 17, 57, 25,
  ];
  const PC1 = [
    57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35,
    27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46,
    38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
  ];
  const PC2 = [
    14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27,
    20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56,
    34, 53, 46, 42, 50, 36, 29, 32,
  ];
  const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
  const E = [
    32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15,
    16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28,
    29, 28, 29, 30, 31, 32, 1,
  ];
  const SBOX = [
    [
      [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
      [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
      [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
      [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    ],
    [
      [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10],
      [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5],
      [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15],
      [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    ],
    [
      [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8],
      [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1],
      [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7],
      [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    ],
    [
      [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15],
      [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9],
      [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4],
      [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    ],
    [
      [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9],
      [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6],
      [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14],
      [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    ],
    [
      [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11],
      [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8],
      [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6],
      [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    ],
    [
      [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1],
      [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6],
      [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2],
      [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    ],
    [
      [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7],
      [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2],
      [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8],
      [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
    ],
  ];
  const P = [
    16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14,
    32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25,
  ];

  const permute = (bits, table) => table.map((i) => bits[i - 1]);
  const xor = (a, b) => a.map((v, i) => v ^ b[i]);
  function leftRotate(arr, n) {
    return arr.slice(n).concat(arr.slice(0, n));
  }

  function strToBits8Chars(text) {
    text = (text + "\0\0\0\0\0\0\0").slice(0, 8);
    const bits = [];
    for (let i = 0; i < 8; i++) {
      const code = text.charCodeAt(i);
      const bin = code.toString(2).padStart(8, "0");
      for (const ch of bin) bits.push(Number(ch));
    }
    return bits;
  }

  function hexToBits(hex) {
    hex = hex.replace(/\s|0x/gi, "");
    hex = hex.padEnd(16, "0");
    const bits = [];
    for (let i = 0; i < hex.length; i++) {
      const v = parseInt(hex[i], 16);
      const bin = v.toString(2).padStart(4, "0");
      for (const ch of bin) bits.push(Number(ch));
    }
    return bits.slice(0, 64);
  }

  function bitsToHex(bits) {
    let s = bits.join("");
    while (s.length % 4) s += "0";
    const arr = s.match(/.{1,4}/g);
    return arr
      .map((n) => parseInt(n, 2).toString(16))
      .join("")
      .toUpperCase();
  }

  function generateSubkeys(keyBits) {
    const perm = permute(keyBits, PC1); //56
    let C = perm.slice(0, 28),
      D = perm.slice(28);
    const subkeys = [];
    for (let i = 0; i < 16; i++) {
      C = leftRotate(C, SHIFTS[i]);
      D = leftRotate(D, SHIFTS[i]);
      subkeys.push(permute(C.concat(D), PC2));
    }
    return subkeys;
  }

  // === BÊN TRONG DES.JS ===

  function feistel(R_bits, K_bits) {
    // 1. Expansion (E)
    const E_out_bits = permute(R_bits, E);

    // 2. Key XOR
    const XOR_out_bits = xor(E_out_bits, K_bits);

    let s_box_in_chunks_bits = []; // Mảng 8 chunk (mỗi chunk 6 bit)
    let s_box_out_bits = []; // Mảng 32 bit kết quả

    // 3. S-Box Substitution
    for (let i = 0; i < 8; i++) {
      const chunk = XOR_out_bits.slice(i * 6, i * 6 + 6);
      s_box_in_chunks_bits.push(chunk); // Lưu lại chunk 6-bit

      const row = (chunk[0] << 1) | chunk[5];
      const col =
        (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
      const val = SBOX[i][row][col];
      const bin = val.toString(2).padStart(4, "0");

      for (const ch of bin) s_box_out_bits.push(Number(ch));
    }

    // 4. Permutation (P)
    const P_out_bits = permute(s_box_out_bits, P);

    // Trả về đối tượng chi tiết thay vì chỉ P_out_bits
    return {
      R_in_hex: bitsToHex(R_bits.slice(0, 32)), // R đầu vào (32-bit)
      E_out_hex: bitsToHex(E_out_bits), // Kết quả E-box (48-bit)
      Subkey_hex: bitsToHex(K_bits), // Subkey dùng (48-bit)
      XOR_out_hex: bitsToHex(XOR_out_bits), // Kết quả E ⊕ K (48-bit)

      // Chi tiết S-Box
      S_in_chunks_hex: s_box_in_chunks_bits.map((chunk) => bitsToHex(chunk)), // 8 chunk 6-bit (hex)
      S_out_hex: bitsToHex(s_box_out_bits), // Kết quả S-Box (32-bit)

      P_out_hex: bitsToHex(P_out_bits), // Kết quả P-Box (32-bit)
      f_result_bits: P_out_bits, // Bits kết quả cuối cùng của f
    };
  }

  function desCore(inputBits, keyBits, decrypt = false) {
    const subkeys = generateSubkeys(keyBits);
    const keys = decrypt ? subkeys.slice().reverse() : subkeys.slice();
    let bits = permute(inputBits, IP);
    let L = bits.slice(0, 32),
      R = bits.slice(32);
    const steps = [];
    for (let r = 0; r < 16; r++) {
      // *** THAY ĐỔI Ở ĐÂY ***
      // const f = feistel(R, keys[r]); // Dòng cũ
      const feistel_details = feistel(R, keys[r]); // Dòng mới

      // const newR = xor(L, f); // Dòng cũ
      const newR = xor(L, feistel_details.f_result_bits); // Dòng mới

      steps.push({
        round: r + 1,
        L_in: bitsToHex(L), // L đầu vào vòng này
        R_in: bitsToHex(R), // R đầu vào vòng này
        subkey: feistel_details.Subkey_hex, // Subkey (từ object mới)

        // Thêm chi tiết Feistel
        feistel: feistel_details,

        L_out: bitsToHex(R), // L kết quả (L(i+1) = R(i))
        R_out: bitsToHex(newR), // R kết quả (R(i+1) = L(i) XOR f)
      });
      // *** KẾT THÚC THAY ĐỔI ***

      L = R;
      R = newR;
    }
    const pre = R.concat(L);
    const finalBits = permute(pre, FP);
    return { finalBits, steps, subkeys };
  }

  function encryptBlockFromText(plaintextText, keyText) {
    const P = strToBits8Chars(plaintextText);
    const K = strToBits8Chars(keyText);
    const { finalBits, steps, subkeys } = desCore(P, K, false);
    return { cipherHex: bitsToHex(finalBits), steps, subkeys };
  }

  function decryptBlockFromHex(cipherHex, keyText) {
    const P = hexToBits(cipherHex);
    const K = strToBits8Chars(keyText);
    const { finalBits, steps, subkeys } = desCore(P, K, true);
    let out = "";
    for (let i = 0; i < 8; i++) {
      const byte = finalBits.slice(i * 8, i * 8 + 8).join("");
      out += String.fromCharCode(parseInt(byte, 2));
    }
    return { plaintext: out, steps, subkeys };
  }

  return { encryptBlockFromText, decryptBlockFromHex };
})();
