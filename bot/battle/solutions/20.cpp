#include <iostream>
#include <string>
#include <stack>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    if (!(cin >> s)) return 0;
    stack<char> st;
    for (char c : s) {
        if (!st.empty() && ((st.top() == 'A' && c == 'B') || (st.top() == 'C' && c == 'D'))) {
            st.pop();
        } else {
            st.push(c);
        }
    }
    cout << st.size() << "\n";
    return 0;
}
