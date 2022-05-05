import { describe, it } from 'mocha';
import { assert }       from 'chai';

import Tree from '../src/index';

describe('before after value', () => {

  it('nodeBeforeKey', () => {
    const tree = new Tree();
    tree.insert(1, 4);
    tree.insert(2, 5);
    tree.insert(3, 6);
    tree.insert(4, 7);
    assert.equal(tree.nodeBeforeKey(7).data, 7);
    assert.equal(tree.nodeBeforeKey(4).data, 6);
    assert.equal(tree.nodeBeforeKey(3).data, 5);
    assert.equal(tree.nodeBeforeKey(2).data, 4);
    assert.isNull(tree.nodeBeforeKey(1));
    assert.isNull(tree.nodeBeforeKey(-11));
  });

  it('nodeAfterKey', () => {
    const tree = new Tree();
    tree.insert(1, 4);
    tree.insert(2, 5);
    tree.insert(3, 6);
    tree.insert(4, 7);
    assert.equal(tree.nodeAfterKey(-1).data, 4);
    assert.equal(tree.nodeAfterKey(1).data, 5);
    assert.equal(tree.nodeAfterKey(2).data, 6);
    assert.equal(tree.nodeAfterKey(3).data, 7);
    assert.isNull(tree.nodeAfterKey(4));
    assert.isNull(tree.nodeAfterKey(5));
    assert.isNull(tree.nodeAfterKey(6));
  });

  it('test with random', () => {
    const tree = new Tree(null, true);
    const num = 1000;

    for (let i = 0; i < num; i++) {
      const v = Math.round(Math.random()*10000 - 5000);
      tree.insert(v, v);
    }

    const minKey = tree.min();
    const maxKey = tree.max();
    let arr = [];
    tree.forEach(node => arr.push(node.key));

    for (let i = 0; i < 100; i++) {
      const p = Math.round(Math.random()*(arr.length - 2) + 1);
      assert.equal(tree.nodeBeforeKey(arr[p]).data, arr[p - 1]);
    }

    assert.isNull(tree.nodeBeforeKey(minKey - 1))
    assert.isNull(tree.nodeBeforeKey(minKey))
    assert.equal(tree.nodeBeforeKey(maxKey).data, arr[arr.length - 2]);
    assert.equal(tree.nodeBeforeKey(maxKey + 1).data, arr[arr.length - 1]);

    for (let i = 0; i < 1000; i++) {
      const p = Math.round(Math.random()*(arr.length - 2) + 1);
      assert.equal(tree.nodeAfterKey(arr[p]).data, arr[p + 1]);
    }

    assert.isNull(tree.nodeAfterKey(maxKey))
    assert.isNull(tree.nodeAfterKey(maxKey + 1))
    assert.equal(tree.nodeAfterKey(minKey).data, arr[1]);
    assert.equal(tree.nodeAfterKey(minKey - 1).data, arr[0]);

  })
})
