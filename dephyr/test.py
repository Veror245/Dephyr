# ==========================================
# Python import + function-call test fixture
# ==========================================

# ---------- Normal imports ----------

import os

import sys
import json

import numpy as np

import pandas as pd
import matplotlib.pyplot as plt


# ---------- Multiple imports ----------

import requests, pathlib, re


# ---------- from imports ----------

from os import path

from os import getcwd, listdir

from pathlib import Path as P

from collections import defaultdict as dd, Counter


# ---------- Star import ----------

from math import *


# ---------- Submodule imports ----------

import numpy.random

import urllib.parse as urlparse

from numpy.random import rand

from pandas.core.frame import DataFrame


# ---------- Relative imports ----------

from . import utils

from .utils import helper

from .utils import helper as h

from .. import config

from ..config import settings

from ..models.user import User


# ---------- Future import ----------

from __future__ import annotations


# ==========================================
# Function calls
# ==========================================

# ---------- Simple calls ----------

print("hello")

len([1, 2, 3])

sum([1, 2, 3])

foo()


# ---------- Calls with arguments ----------

print("hello", 123)

max(1, 2, 3)

open("file.txt", "r")

range(10)


# ---------- Keyword arguments ----------

requests.get(
    "https://example.com",
    timeout=10,
)

sorted(
    [3, 1, 2],
    reverse=True,
)


# ---------- Method calls ----------

text = "hello world"

text.upper()

text.split(" ")

items = [1, 2, 3]

items.append(4)

items.sort()


# ---------- Chained calls ----------

foo().bar()

foo().bar().baz()

requests.get("https://example.com").json()

Path("file.txt").resolve().exists()


# ---------- Calls on imported modules ----------

os.path.join("foo", "bar")

os.getcwd()

np.array([1, 2, 3])

pd.DataFrame(
    {
        "name": ["Alice", "Bob"],
        "age": [20, 21],
    }
)

plt.plot([1, 2, 3])


# ---------- Calls on imported aliases ----------

np.random.rand(10)

pd.read_csv("data.csv")

urlparse.urlparse("https://example.com")


# ---------- Constructor calls ----------

Path("file.txt")

P("another_file.txt")

Counter([1, 2, 2, 3])

dd(list)


# ---------- Nested calls ----------

print(len(items))

foo(bar())

foo(bar(baz()))

max(len(x) for x in items)


# ---------- Calls inside expressions ----------

result = foo()

x = len(items) + 10

value = foo() * bar()

if foo():
    print("yes")


# ---------- Calls inside control flow ----------

for item in get_items():
    process(item)


while check_condition():
    update()


# ---------- Calls inside comprehensions ----------

values = [process(x) for x in items]

mapping = {get_key(x): get_value(x) for x in items}


# ---------- Calls inside functions ----------


def main():
    data = load_data()
    result = process(data)
    save_result(result)


# ---------- Calls inside classes ----------


class Example:
    def __init__(self):
        self.data = load_data()

    def run(self):
        return process(self.data)


# ---------- Dynamic imports ----------
# These are NOT Import/ImportFrom AST nodes.
# They appear as ordinary Call nodes.

import importlib

module = importlib.import_module("requests")

dynamic = __import__("numpy")


# ---------- Calls through variables ----------

func = foo

func()

callback = requests.get

callback("https://example.com")


# ---------- Lambda call ----------

(lambda x: x * 2)(10)


# ---------- Builtin calls ----------

id(obj)

type(obj)

isinstance(obj, str)

enumerate(items)

zip(keys, values)

map(str, items)

filter(bool, items)
