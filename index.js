"use babel";

import { CompositeDisposable } from "atom";

let jokerExecutablePath;

export default {
  activate() {
    require("atom-package-deps").install("linter-joker");

    const linterName = "linter-joker";

    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.observe(`${linterName}.jokerExecutablePath`, value => {
        jokerExecutablePath = value;
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
      lintsOnChange: false, // or true
      grammarScopes: ["source.clojure"],
      lint(textEditor) {
        const editorPath = textEditor.getPath();

        return helpers
          .exec(jokerExecutablePath, ["--lint", editorPath], {
            stream: "both"
          })
          .then(function(data) {
            const { exitCode, stdout, stderr } = data;

            // console.log("linter-joker: data", data);

            if (exitCode === 0 && stderr) {
              const regex = /[^:]+:(\d+):(\d+): ([\s\S]+)/;

              const messages = stderr
                .split(/\n|\r/)
                .map(function(joke) {
                  const exec = regex.exec(joke);

                  if (!exec) {
                    console.log("linter-joker: failed exec", joke);
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
                .filter(m => m);

              // console.log("linter-joker: messages", messages);

              return messages;
            }

            return [];
          });
      }
    };
  }
};
