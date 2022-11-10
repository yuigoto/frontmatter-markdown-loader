import { mount, createLocalVue } from "@vue/test-utils";
import reactRenderer from 'react-test-renderer';
import React from 'react';
import fs from "fs";
import path from "path";

import markdownIt from "markdown-it";
import nodeEval from "node-eval";

import Loader from "../index";
import Mode from "../mode";
// import ChildComponent from "./child-component";
// import CodeConfusing from "./code-confusing";

let loaded;

const defaultContext = {
  cachable: false,
  resourcePath: "/somewhere/frontmatter.md"
};

const load = (source, context = defaultContext) => {
  const rawLoaded = Loader.call(context, source);
  loaded = nodeEval(rawLoaded, "sample.md");
}

const markdownWithFrontmatter = fs.readFileSync(path.join(__dirname, "with-frontmatter.md"), "utf8");
const markdownWithFrontmatterIncludingChildComponent = fs.readFileSync(path.join(__dirname, "with-frontmatter-including-custom-element.md"), "utf8");
const markdownWithFrontmatterIncludingPascalChildComponent = fs.readFileSync(path.join(__dirname, "with-frontmatter-including-custom-element-by-pascal.md"), "utf8");;

describe("frontmatter-markdown-loader", () => {
  afterEach(() => {
    loaded = undefined;
  });

  describe("against Frontmatter markdown without any option", () => {
    beforeEach(() => {
      load(markdownWithFrontmatter);
    });

    it("returns compiled HTML for 'html' property", () => {
      expect(loaded.html).toBe(
        "<h1>Title</h1>\n<p>GOOD <code>BYE</code> FRIEND\nCHEERS</p>\n<pre><code class=\"language-js\">const templateLiteral = `ok`;\nconst multipleLine = true;\nconsole.warn(multipleLine + &quot;\\n&quot;)\n</code></pre>\n"
      );
    });

    it("returns frontmatter object for 'attributes' property", () => {
      expect(loaded.attributes).toEqual({
        subject: "Hello",
        tags: ["tag1", "tag2"]
      });
    });

    it("doesn't return 'body' property", () => {
      expect(loaded.body).toBeUndefined();
    });

    it("doesn't return 'meta' property", () => {
      expect(loaded.meta).toBeUndefined();
    });

    it("doesn't return 'vue' property", () => {
      expect(loaded.vue).toBeUndefined();
    });

    it("doesn't return 'react' property", () => {
      expect(loaded.react).toBeUndefined();
    });
  });

  describe("markdown option", () => {
    it("returns HTML with custom renderer", () => {
      load(markdownWithFrontmatter, { ...defaultContext, query: { markdown: md => "<p>Compiled markdown by the custom compiler</p>" } });
      expect(loaded.html).toBe("<p>Compiled markdown by the custom compiler</p>");
    });

    it("throws if both markdown and markdownIt are given", () => {
      expect(() => {
        load(markdownWithFrontmatter, { ...defaultContext, query: { markdown: md => "<p>custom</p>", markdownIt: "option" } });
      }).toThrow();
    });
  });

  describe("markdownId option", () => {
    it("returns HTML with configured markdownIt: breaks option is enabled as configuration", () => {
      load(markdownWithFrontmatter, { ...defaultContext, query: { markdownIt: { breaks: true } } });
      expect(loaded.html).toBe(
        "<h1>Title</h1>\n<p>GOOD <code>BYE</code> FRIEND<br>\nCHEERS</p>\n<pre><code class=\"language-js\">const templateLiteral = `ok`;\nconst multipleLine = true;\nconsole.warn(multipleLine + &quot;\\n&quot;)\n</code></pre>\n"
      )
    });

    it("returns HTML with configured markdownIt instance: breaks option is enabled by .enable", () => {
      const markdownItInstance = markdownIt();
      const defaultRender = markdownItInstance.link_open || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };
      markdownItInstance.renderer.rules.paragraph_open = function (tokens, idx, options, env, self) {
        tokens[idx].attrPush(['data-paragraph', 'hello']);
        return defaultRender(tokens, idx, options, env, self);
      };

      load(markdownWithFrontmatter, { ...defaultContext, query: { markdownIt: markdownItInstance } });
      expect(loaded.html).toBe(
        "<h1>Title</h1>\n<p data-paragraph=\"hello\">GOOD <code>BYE</code> FRIEND\nCHEERS</p>\n<pre><code class=\"language-js\">const templateLiteral = `ok`;\nconst multipleLine = true;\nconsole.warn(multipleLine + &quot;\\n&quot;)\n</code></pre>\n"
      );
    });
  });


  describe("body mode is enabled", () => {
    it("returns raw markdown body for 'body' property", () => {
      load(markdownWithFrontmatter, { ...defaultContext, query: { mode: [Mode.BODY] } });
      expect(loaded.body).toBe(
        "# Title\r\n\r\nGOOD `BYE` FRIEND\r\nCHEERS\r\n\r\n```js\r\nconst templateLiteral = `ok`;\r\nconst multipleLine = true;\r\nconsole.warn(multipleLine + \"\\n\")\r\n```\r\n"
      );
    });
  });

  describe("meta mode is enabled", () => {
    it("returns meta data on 'meta' property", () => {
      load(markdownWithFrontmatter, { ...defaultContext, query: { mode: [Mode.META] } });
      expect(loaded.meta).toEqual({
        resourcePath: "/somewhere/frontmatter.md"
      });
    });
  });
});
