import { Element, Node } from 'hast';
import is from 'hast-util-is-element';
import h from 'hastscript';
import { Plugin } from 'unified';
import visit, { SKIP } from 'unist-util-visit';
import { stringify } from '../src/index';

const postMarkdown: Plugin = function () {
  if (!this.Parser) return;

  const { blockTokenizers } = this.Parser.prototype;
  blockTokenizers.list = () => false;
};

const postHtml = function () {
  return (tree: Node) => {
    visit<Element>(tree, 'element', (node) => {
      if (is(node, 'div')) {
        const value = node.properties?.className;
        const className: any[] = Array.isArray(value) ? value : [value];
        if (className.length === 1 && className[0] === 'foo') {
          visit<Node>(node, ['element', 'text'], (x, index, parent) => {
            if (!parent) {
              return;
            }
            if (is(x, 'br')) {
              parent.children.splice(index, 1);
              return [SKIP, index];
            } else if (x.type === 'text') {
              parent.children[index] = h('p', x.value as string);
            }
          });
        }
      }
    });
  };
};

it('plugins', () => {
  const received = stringify(
    `<div class="foo">A<br>
B<br>
C</div><div class="custom">

# Heading

- unordered list
- unordered list
- unordered list

1. ordered list
1. ordered list
1. ordered list
  
</div>`,
    {
      plugins: {
        postMarkdown: [[postMarkdown, {}]],
        postHtml: [[postHtml, {}]],
      },
    },
  );
  const expected = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Heading</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <div class="foo">
      <p>A</p>
      <p>B</p>
      <p>C</p>
    </div>
    <div class="custom">
      <section id="heading" class="level1">
        <h1>Heading</h1>
        <p>
          - unordered list
          - unordered list
          - unordered list
        </p>
        <p>
          1. ordered list
          1. ordered list
          1. ordered list
        </p>
      </section>
    </div>
  </body>
</html>
`;
  expect(received).toBe(expected);
});
