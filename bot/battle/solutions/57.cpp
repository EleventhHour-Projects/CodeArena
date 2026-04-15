#include <iostream>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    cout << (n % 4 != 0 ? "true" : "false") << "\n";
    return 0;
}
