import math
import sqlite3
import statistics
import sys
from collections import defaultdict

GOLDEN = (1 + 5 ** 0.5) / 2
JITTER = 0.3

def get_runs(db, dataset):
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    rows = con.execute(
        "SELECT algorithm, nodes, time FROM measurements WHERE dataset = ? ORDER BY time",
        (dataset,),
    )

    runs = defaultdict(list)
    for algorithm, nodes, time in rows:
        runs[algorithm, nodes].append(time)

    return runs


def points_filter(times):
    """Exclude outliers by IQR rule."""
    q1, _, q3 = statistics.quantiles(times, n=4, method="inclusive")
    irq = q3 - q1
    low = q1 - 1.5 * irq
    high = q3 + 1.5 * irq

    return [t for t in times if low <= t <= high]


def plot_points(times, nodes, jitter_width):
    """Plot raw point."""
    filtered = points_filter(times)

    points = []
    for i, time in enumerate(filtered):
        fraction = (i * GOLDEN) % 1
        x = nodes * math.exp((fraction * 2 - 1) * jitter_width)
        points.append(f"({x:.4f},{time:.4f})")

    return " ".join(points)


def plot_summary(times, nodes):
    """Plot mean and stdev."""
    logs = [math.log(t) for t in times]

    mean = math.exp(statistics.fmean(logs))
    stdev = math.exp(statistics.stdev(logs))

    upper_error = mean * stdev - mean
    lower_error = mean - mean / stdev

    return f"({nodes},{mean:.4f}) += (0,{upper_error:.4f}) -= (0,{lower_error:.4f})"


def addplot(series, name, points):
    """Generate \\addplot line"""
    coords = " ".join(points)
    return rf"\addplot[chart/series {series}, chart/{name}] coordinates {{{coords}}};"


def print_plot(runs, algorithms, sizes):
    print(r"\def\chartplot{")

    # plot points
    jitter_width = JITTER * min(math.log(b / a) for a, b in zip(sizes, sizes[1:]))
    for i, algorithm in enumerate(algorithms):
        points = [plot_points(runs[algorithm, n], n, jitter_width) for n in sizes]
        print(addplot(i, "points", points))

    # plot summary
    for i, algorithm in enumerate(algorithms):
        points = [plot_summary(runs[algorithm, n], n) for n in sizes]
        print(addplot(i, "summary", points))
        print(rf"\addlegendentry{{{algorithm.capitalize()}}}")

    print("}")


def print_xticks(sizes):
    xticks = ",".join(map(str, sizes))
    print("\\pgfplotsset{chart/xticks/.style={xtick={" + xticks + "}, xticklabels={" + xticks + "}}}")


def main():
    db, dataset = sys.argv[1:]

    runs = get_runs(db, dataset)

    algorithms = sorted({algorithm for algorithm, _ in runs})
    sizes = sorted({nodes for _, nodes in runs})

    print_xticks(sizes)
    print_plot(runs, algorithms, sizes)


if __name__ == "__main__":
    main()
