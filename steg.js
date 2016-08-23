// Rough diagram:
// ************************
// ************************
// ************************
// ************************
// ******** IMAGE *********
// ************************
// ************************
// ************************
// |---- YOUR FILE ----| **
//
// How do we know when to stop reading?
//
// a solution is to include a `size header' that encodes our file size
// using a fixed number of bits
//
// Rough diagram:
// ************************
// ************************
// ************************
// ************************
// ******** IMAGE *********
// ************************
// ************************
// --| ********************
// | SIZE |---- YOUR FILE -










// *********************************************************************
// takes in 2 buffers:
// anything to be hidden, and the file to hide it in
// returns a buffer
// *********************************************************************
function hide(anything, image) {

  // GET SOME BITMAP PROPERTIES
  let width = image.slice(18, 22)
    .reduce((sum, v, i) => sum + v*Math.pow(256,i), 0);
  width = toSigned(width);
  let height = image.slice(22, 26)
    .reduce((sum, v, i) => sum + v*Math.pow(256,i), 0);
  height = toSigned(height);

  function toSigned(num) {
    return num < Math.pow(2, 31) ? num : num - Math.pow(2, 32) ;
  }

  // AREA
  const padding = width*3 % 4;
  const firstIndex = 54;
  const lastIndex = firstIndex + (width*3 + padding)*height;

  // STORABLE BYTES
  const storageSize = Math.abs(Math.floor((lastIndex - firstIndex)/8));
  const fileSize = anything.length;

  console.log(`======== bits per pixel ========\n`);
  console.log(image.slice(28, 30));
  console.log(`18 in hex = ${parseInt('18', 16)} in decimal\n`);
  console.log(`======= image properties =======\n`);
  console.log(`width = ${width}px\nheight = ${height}px`);
  console.log(`padding = ${padding} bytes per row\n`);
  console.log(`======= usable properties ======\n`);
  console.log(`storageSize = ${storageSize - 24} bytes`);
  console.log(`fileSize = ${fileSize} bytes\n`);
  console.log(`================================\n`);

  // CHECK WHETHER WE HAVE ENOUGH SPACE
  if (fileSize < storageSize -24) {
    return writeContent(anything, writeLength(image, fileSize));
  } else {
    console.log(`insufficient storage space`);
  }
}

// *********************************************************************
// write a 24 bit unsigned (+ve) integer indicating the size of the
// embedded file in bytes, using the first 24 bytes of the image
//  e.g. suppose len = 1024 bytes,
//  we have: 000000000000010000000000
//  then bytes  [0, 14) will be ..BYTE.0
//       byte       14  will be ..BYTE.1
//  and  bytes [15, 24) will be ..BYTE.0
// *********************************************************************
function writeLength(buff, len, bits=24, startIndex=54) {
  let result = Buffer.from(buff);
  for (let i = 0; i < bits; i++) {
    let bit = readAtN(len, bits - (i+1));
    result[startIndex + i] = writeLsb(result[startIndex + 1], bit);
  }
  return result;
}

// read the encoded length from the first 24 bytes of the image
function readLength(buff, bits=24, startIndex=54) {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = writeLsb(result << 1, readAtN(buff[startIndex+i]));
  }
  return result;
}

// *********************************************************************
// replace the least significant bit with 'b':
//    START WITH 1 00000001
//             NOT 11111110
//                 ..BYTE..
//             AND ..BYTE.0
//             bit 0000000b
//              OR ..BYTE.b
// *********************************************************************
function writeLsb(byte, bit) {
  return (byte & ~1) | bit;
}

// *********************************************************************
// get bit at position n from the right:
// example n = 3:
//           START 00000001
//             <<3 00001000
//                 ..BYTE..
//             AND 0000T000
//             >>3 0000000T
// *********************************************************************
function readAtN(byte, n=0) {
  return (byte & (1<<n)) >> n;
}

function writeContent(anything, image, startIndex=78) {
  let result = Buffer.from(image);
  anything.forEach((byte, i) => {
    for (let j = 0; j < 8; j++) {
      let bit = readAtN(byte, 7-j);
      result[startIndex + 8*i +j] = writeLsb(result[startIndex + 8*i + j], bit);
    }
  });
  return result;
}

function read(image, lengthBits=24, startIndex=54) {
  let length = readLength(image, lengthBits);
  let contentIndex = startIndex + lengthBits;
  let result = [];
  for (let i = 0; i < length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = writeLsb(byte << 1, readAtN(image[contentIndex + (8*i + j)]));
    }
    result.push(byte);
    byte = 0;
  }
  return Buffer.from(result);
}

const fs = require('fs');
const hidingPlace = fs.readFileSync('./money.bmp');
const fileToHide = fs.readFileSync('./steg.js');
const hiddenFilePath = './hidden.bmp';

// WRITE THE FILE
// fs.writeFileSync(hiddenFilePath, hide(fileToHide, hidingPlace));

// READ HIDDEN FILE CONTENT
// let recovered = read(fs.readFileSync(hiddenFilePath));
// console.log(recovered.toString('utf8'));
// fs.writeFileSync('./recovered', recovered);

// the original file doesn't have anything embedded
// console.log(read(hidingPlace).slice(100, 110).toString('utf8'));
