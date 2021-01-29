<h1 align="center">math-o-matic</h1>
<p align="center"><a href="https://logico-philosophical.github.io/math-o-matic/docs/build/index.html">docs</a> &middot; <a href="https://logico-philosophical.github.io/math-o-matic/web/index.html">main page</a></p>

[![npm](https://img.shields.io/npm/v/math-o-matic)](https://www.npmjs.com/package/math-o-matic)
[![GitHub](https://img.shields.io/github/license/logico-philosophical/math-o-matic)](https://github.com/logico-philosophical/math-o-matic/blob/master/LICENSE)
[![Build Status](https://img.shields.io/travis/com/logico-philosophical/math-o-matic)](https://travis-ci.com/logico-philosophical/math-o-matic)
[![Coverage Status](https://img.shields.io/coveralls/github/logico-philosophical/math-o-matic)](https://coveralls.io/github/logico-philosophical/math-o-matic?branch=master)
[![LGTM Alerts](https://img.shields.io/lgtm/alerts/github/logico-philosophical/math-o-matic)](https://lgtm.com/projects/g/logico-philosophical/math-o-matic/alerts/)
[![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/github/logico-philosophical/math-o-matic)](https://lgtm.com/projects/g/logico-philosophical/math-o-matic/context:javascript)

**English** &middot; [한국어](/README.ko.md)

**math-o-matic** is a computer program that enables you to make an axiomatic system and prove its theorems. Its aim is to make it easy to write and read rigorous mathematical proofs. You can see the current axiomatic system by pressing one of the buttons at the bottom of the [main page](https://logico-philosophical.github.io/math-o-matic/web/index.html).

## Code example

<pre><code>"[$1+1=2]이다."
<b>theorem</b> one_plus_one_is_two() {
    one_in_omega()
    &gt; omega_add_one(ord_one) <b>as</b> eq(omega_add(ord_one, ord_one), ord_two)
}</code></pre>

The above code produces&hellip;

<p align="center"><img src="https://i.imgur.com/r468tLi.png" width="500px"><br>
<i>A proof of</i> <code>1 + 1 = 2</code></p>

&hellip;a proof of the equation `1 + 1 = 2`. The proof is verified by the math-o-matic program, and the name of the theorem is colored green if the proof is valid. The **proof explorer** also shows the individual steps of the proof in a human-readable format. The names in green refer to theorems that are already proved, and the symbols in blue are predefined notions.

## Keep reading

* Find more math-o-matic code in [/math](/math) directory.
* Refer to the [documentation](https://logico-philosophical.github.io/math-o-matic/docs/build/index.html) to learn how to write proofs.
* Click on the colored parts of the proof above in the [main page](https://logico-philosophical.github.io/math-o-matic/web/index.html) to jump to definitions.
* math-o-matic language support for Visual Studio Code and Sublime Text 3 can be found in [/tools](/tools).

## Contributing

A lot of theorems need proofs. Please open a pull request after you prove new theorems.

Refer to [CONTRIBUTING.md](/CONTRIBUTING.md) for more information.
