"use babel";

import { CompositeDisposable } from "atom";
import { dirname } from "path";

const linterName = "linter-joker";
let jokerExecutablePath;
let lintsOnChange;

export default {
  activate() {
    require("atom-package-deps").install("linter-joker");

    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.observe(`${linterName}.jokerExecutablePath`, value => {
        jokerExecutablePath = value;
      })
    );

    this.subscriptions.add(
      atom.config.observe(`${linterName}.lintsOnChange`, value => {
        lintsOnChange = value;
      })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    const helpers = require("atom-linter");

    return {
      name: "joker",
      scope: "file", // or 'project'
      lintsOnChange: lintsOnChange,
      grammarScopes: ["source.clojure"],
      lint(textEditor) {
        const editorPath = textEditor.getPath();
        const editorText = textEditor.getText();
        const [extension] = editorPath.match(/\.\w+$/gi) || [];

        // console.log("linter-joker: file extension", extension);

        const command =
          extension === ".clj"
            ? "--lintclj"
            : extension === ".cljs"
              ? "--lintcljs"
              : extension === ".edn" || extension === ".joker"
                ? "--lintedn"
                : extension === ".joke" ? "--lintjoker" : "--lintclj";

        return helpers
          .exec(jokerExecutablePath, [command, "-"], {
            cwd: dirname(editorPath),
            uniqueKey: linterName,
            stdin: editorText,
            stream: "both"
          })
          .then(function(data) {
            if (!data) {
              // console.log("linter-joker: process killed", data);
              return null;
            }

            const { exitCode, stdout, stderr } = data;

            // console.log("linter-joker: data", data);

            if (exitCode === 1 && stderr) {
              const regex = /[^:]+:(\d+):(\d+): ([\s\S]+)/;

              const messages = stderr
                .split(/[\r\n]+/)
                .map(function(joke) {
                  const exec = regex.exec(joke);

                  if (!exec) {
                    // console.log("linter-joker: failed exec", joke);
                    return null;
                  }

                  const line = Number(exec[1]);
                  const excerpt = exec[3];

                  return {
                    severity: excerpt.startsWith("Parse warning:")
                      ? "warning"
                      : "error",
                    location: {
                      file: editorPath,
                      position: helpers.generateRange(textEditor, line - 1)
                    },
                    excerpt: `${excerpt}`
                  };
                })
                .filter(m => m); // filter out null messages

              // console.log("linter-joker: messages", messages);

              return messages;
            }

            return [];
          });
      }
    };
  }
};
