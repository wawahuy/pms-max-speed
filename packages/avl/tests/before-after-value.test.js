import { describe, it } from 'mocha';
import { assert }       from 'chai';

import Tree from '../src/index';

describe('before after value', () => {

  it('should return key as the result of search', () => {
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

    assert.equal(tree.nodeAfterKey(-1).data, 4);
    assert.equal(tree.nodeAfterKey(1).data, 5);
    assert.equal(tree.nodeAfterKey(2).data, 6);
    assert.equal(tree.nodeAfterKey(3).data, 7);
    assert.isNull(tree.nodeAfterKey(4));
    assert.isNull(tree.nodeAfterKey(5));
    assert.isNull(tree.nodeAfterKey(6));
  });
})
