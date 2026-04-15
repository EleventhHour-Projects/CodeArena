#include <iostream>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n, m;
    if (!(cin >> n >> m)) return 0;
    int notDiv = 0, div = 0;
    for (int i = 1; i <= n; i++) {
        if (i % m == 0) div += i;
        else notDiv += i;
    }
    cout << notDiv - div << "\n";
    return 0;
}
