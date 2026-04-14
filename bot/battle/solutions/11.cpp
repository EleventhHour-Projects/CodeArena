#include <iostream>

using namespace std;

int main() {
    long long n;
    if (!(cin >> n)) return 0;
    if (n > 0 && (n & (n - 1)) == 0 && (n & 0x5555555555555555LL)) {
        cout << "true\n";
    } else {
        cout << "false\n";
    }
    return 0;
}
