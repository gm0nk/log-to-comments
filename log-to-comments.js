fs = require("fs");
path = require("path");

//===========constants============

const SPECIAL_CHAR = "//#";
const LINE_SEPARATOR = "\n";
const DEFAULT_DIRECTORY = ".";

//===========helpers==============

const splitLines = (str) => str.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);

function getCleanArray(script) {
  const cleanLine = (line) => {
    const commentStart = line.indexOf(SPECIAL_CHAR);
    if (commentStart === -1) {
      return line;
    } else {
      let slice = line.slice(0, line.indexOf(SPECIAL_CHAR));
      if (slice.length > 0) {
        return slice;
      } else {
        return null;
      }
    }
  };
  const lines = splitLines(script);
  return lines.map((line) => cleanLine(line)).filter((line) => line != null);
}

function evaluateScript(script) {
  // const escapeSpecial = (script) => script.replace(/\\n/g, "\\n");
  const logToConsole = console.log;
  const logs = [];
  console.log = (text) => logs.push(text);
  try {
    eval(script);
  } catch(error) {
    console.log(error);
  }
  console.log = logToConsole;
  return logs;
}

function insertLogs(scriptArray, logs) {
  let logIndex = 0;
  const newScriptArray = [];
  for (let line of scriptArray) {
    const res = line.match(/console\.log\(.*\);?/);

    if (res) {
      if ((line.startsWith('//')) || (logs[logIndex] == null)) {
        newScriptArray.push(line);
        continue;
      }
      let outputLines = splitLines(logs[logIndex].toString());
      if (outputLines.length > 1) {
        newScriptArray.push(line);
        outputLines.forEach((line) =>
          newScriptArray.push(SPECIAL_CHAR + " " + line)
        );
      } else {
        newScriptArray.push(line + SPECIAL_CHAR + " " + logs[logIndex].toString());
      }
      logIndex++;
    } else {
      newScriptArray.push(line);
    }
  }
  return newScriptArray;
}

//===========main=============================

let previousLogs = [];
const directory = path.resolve(process.argv[2] || DEFAULT_DIRECTORY);
fs.watch(directory, (eventType, filename) => {
  console.log(eventType);
  if (eventType !== "change") return;
  if (filename) {
    if (
      path.resolve(path.join(directory, filename)) ===
      path.resolve(process.argv[1])
    ) {
      return;
    }
    const script = fs.readFileSync(path.join(directory, filename), "utf-8");
    const logs = evaluateScript(script);
    if (JSON.stringify(previousLogs) === JSON.stringify(logs)) {
      return;
    }
    previousLogs = logs;
    const cleanArr = getCleanArray(script);
    const scriptWithLogs = insertLogs(cleanArr, logs).join(LINE_SEPARATOR);
    console.log(logs);
    console.log(cleanArr);
    fs.writeFileSync(path.join(directory, filename), scriptWithLogs);
  } else {
    console.log("filename not provided");
  }
});
