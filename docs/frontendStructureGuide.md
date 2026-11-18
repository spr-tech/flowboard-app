# Building a Frontend That Stays Maintainable

A guide to structuring a React/Next.js application so that it keeps its shape as it grows.

This is written for someone who already has a working project and wants to refactor it into something
a team could pick up. It assumes you know React. It does not assume you have any shared components
yet, so where a pattern depends on one, the component itself is described well enough for you to
build it.

Read it once end to end before changing anything. The last section gives you an order to work in.

---

## Table of Contents

1. [The idea behind all of it](#1-the-idea-behind-all-of-it)
2. [Project structure](#2-project-structure)
3. [Pages are thin, content does the work](#3-pages-are-thin-content-does-the-work)
4. [The component layer you need to build](#4-the-component-layer-you-need-to-build)
5. [The data layer](#5-the-data-layer)
6. [Global error handling](#6-global-error-handling)
7. [Forms](#7-forms)
8. [Modals, and why forms must not live inside them](#8-modals-and-why-forms-must-not-live-inside-them)
9. [Tables](#9-tables)
10. [State: server state is not app state](#10-state-server-state-is-not-app-state)
11. [Naming](#11-naming)
12. [When to pull a function out](#12-when-to-pull-a-function-out)
13. [Comments](#13-comments)
14. [The refactor, in order](#14-the-refactor-in-order)
15. [Smells to grep for](#15-smells-to-grep-for)

---

## 1. The idea behind all of it

Almost every rule below comes from one principle:

> **Separate the things that change for different reasons.**

A screen changes when the business changes its mind. A button changes when the designer changes the
brand. An API call changes when the backend changes a route. If all three live in the same file, then
all three people are editing the same file, and none of them can tell which part is theirs.

So the work of structuring an app is mostly the work of deciding where a change should land, and then
making sure there is exactly one obvious place for it.

Two practical tests you can apply to any file you are about to write:

- **The one-reason test.** If I can name two unrelated reasons this file would be edited, it is doing
  two jobs.
- **The second-use test.** Could a second screen use this without being changed? If not, and it looks
  generic, it is not actually generic yet.

Do not over-apply this. Abstraction you add before you need it is a cost with no return. The honest
rule is that the second time you write something, you notice. The third time, you extract it.

---

## 2. Project structure

Folders should be named after what lives in them, not after what kind of JavaScript it is. A folder
called `utils` tells you nothing. A folder called `services` tells you where API calls live.

```
src/
├── app/                      # Routing only. One small file per route.
│   ├── (auth)/               # Route group for unauthenticated pages
│   ├── dashboard/            # Protected routes
│   └── layout.tsx
│
├── components/
│   ├── ui/                   # Generic, reusable, knows nothing about your domain
│   │   ├── button/
│   │   ├── input/
│   │   ├── select/
│   │   ├── datepicker/
│   │   ├── modal/
│   │   ├── table/
│   │   ├── toast/
│   │   └── typography/
│   │
│   ├── layouts/              # Page shells: sidebar, header, auth split screen
│   │
│   └── content/              # Feature screens. Knows your domain.
│       └── dashboard/
│           ├── orders/
│           │   ├── ordersContent.tsx
│           │   ├── forms/
│           │   └── modals/
│           └── customers/
│
├── services/                 # One file per backend controller
├── configs/                  # API client setup, env config
├── models/
│   ├── requests/             # What you send
│   ├── responses/            # What you receive
│   └── validations/          # Yup schemas, one file per controller
├── stores/                   # Client-only state
└── utilities/
    ├── hooks/
    ├── enums/
    ├── helpers/
    └── constants/
```

### The rule that makes this work

**`ui/` may never import from `content/`.** The dependency only runs one way: feature code imports
generic code. The moment a button needs to know what an order is, the button has stopped being a
button.

If you find yourself wanting to break that rule, you usually want a prop instead. Pass the behaviour
in; do not reach out for it.

### Why `content/` is separate from `app/`

Next.js route files come with framework concerns attached: they are server components by default,
they receive route params, they get wrapped in layouts. If your screen logic lives in them, your
screen logic is tied to the router. Move it one level out and the screen becomes an ordinary
component you can render anywhere, including a test.

---

## 3. Pages are thin, content does the work

A route file should be short enough to read in one glance.

```tsx
// app/dashboard/orders/page.tsx
import OrdersContent from "@/components/content/dashboard/orders/ordersContent";

export default function Page() {
    return <OrdersContent />;
}
```

Everything else goes in `ordersContent.tsx`: the table, the filters, the modals, the handlers.

If a content file grows past roughly 300 lines, it is usually hiding three things that want to be
separate: the table and its columns, the filter bar, and the modals. Split by what a reader would
look for, not by line count.

---

## 4. The component layer you need to build

This is the part you do not have yet, and it is the part that pays off most. Before any screen is
written, you need a small set of components that every screen uses. The goal is that **a feature file
never contains a raw `<input>`, a raw `<button>`, or a hand-rolled dropdown.**

Why this matters more than it sounds: the day someone asks you to change every error message from red
text under the field to a tooltip, you want that to be one file, not ninety.

Here is the inventory, with what each one owes you.

### 4.1 Button

Your own `Button`, wrapping the native element.

It must own: variants (primary, secondary, danger, ghost), sizes, a loading state that disables the
button and shows a spinner, optional start and end icons, and `type` defaulting to `button` so a
button inside a form does not submit by accident.

The loading state is the point. Without it, every screen writes its own `disabled={isLoading}` and
its own spinner, and they all look slightly different.

```tsx
<Button text="Save" type="submit" isLoading={isSaving} />
<Button text="Delete" variant="danger" onClick={handleDelete} />
```

### 4.2 Form field components

One component per input type: `Input`, `Select`, `DatePicker`, `Checkbox`, `FileUpload`, `TextArea`.

Each one must own:

- the label, and a required marker when required
- the error message, read from the form state, shown only after the field has been touched
- helper text
- the disabled state
- consistent spacing, so a form is a stack of fields with no margin juggling

And critically, each one takes the form object directly rather than four separate props:

```tsx
<Input formik={formik} name="email" label="Email" />
```

not

```tsx
<input
    value={formik.values.email}
    onChange={formik.handleChange}
    onBlur={formik.handleBlur}
/>
{formik.touched.email && formik.errors.email && <span>{formik.errors.email}</span>}
```

The second version is four lines of ceremony repeated for every field in your application, and every
one of them is a chance to forget the `touched` check.

A sketch of the binding, which is the only non-obvious part:

```tsx
type InputProps = {
    formik?: FormikProps<any>;
    name: string;
    label?: string;
    required?: boolean;
    helperText?: string;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const Input = ({formik, name, label, required, helperText, inputProps}: InputProps) => {
    const value = formik ? getIn(formik.values, name) : undefined;
    const error = formik ? getIn(formik.errors, name) : undefined;
    const touched = formik ? getIn(formik.touched, name) : false;
    const showError = Boolean(touched && error);

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label htmlFor={name} className="text-sm font-medium">
                    {label} {required && <span className="text-red-600">*</span>}
                </label>
            )}
            <input
                id={name}
                name={name}
                value={value ?? ""}
                onChange={formik?.handleChange}
                onBlur={formik?.handleBlur}
                className={cn("rounded border px-3 py-2", showError && "border-red-500")}
                {...inputProps}
            />
            {(showError || helperText) && (
                <p className={cn("text-xs", showError ? "text-red-600" : "text-gray-500")}>
                    {showError ? String(error) : helperText}
                </p>
            )}
        </div>
    );
};
```

`getIn` is from Formik and handles nested names like `address.city` or `items[0].price`. Reaching
into `formik.errors[name]` directly breaks the moment a field is nested.

One warning worth knowing in advance: if your schema can produce an error on a whole array rather
than on one of its entries, that error is a string sitting on the array. Indexing it like
`errors.items[0]` then returns the first character of that string, and your form shows a stray letter
under a field. If you validate arrays as a whole, guard for it.

**Numbers:** avoid `<input type="number">`. It swallows keystrokes, scrolls the value on a mouse
wheel, and formats inconsistently across browsers. Use a text input with your own formatting, which
also lets you display thousands separators while keeping a clean value in state.

### 4.3 Modal shell

A `ModalLayout` that owns the overlay, the panel, the title row, the close button, the width options,
and the escape-to-close behaviour. Feature modals render their content inside it and never think
about any of that.

```tsx
<ModalLayout title="Add Order" onClose={onModalClose} width="medium">
    {children}
</ModalLayout>
```

### 4.4 Table

A wrapper over whichever grid library you choose. Your screens should pass columns and a fetch
function, nothing more. The wrapper owns pagination, the loading state, the empty state, the header
with its create and refresh buttons, and column alignment.

Expose an imperative `refresh()` so that a modal which just created a row can tell the table to
reload.

### 4.5 Toast

One function, called from anywhere.

```tsx
toast({type: "success", message: "Order created"});
```

Guard against duplicates with a key, or a failing request that retries three times will stack three
identical red boxes on the screen.

### 4.6 Empty state

Shown when a table has no rows. It should say what the table is, offer the action that would create
the first row, and offer refresh.

Two small things that are easy to get wrong and look careless when you do: do not lowercase the table
name to splice it into a sentence, because a table called "November" becomes "november" and a table
called "FX Rates" becomes "fx rates". And do not say "get started by adding one" on a table that has
no create button, because there is nothing for the reader to press.

### 4.7 Typography

A `Text` component with size, weight and colour props. This is the least exciting item on the list
and the one that most reliably keeps an app from looking homemade, because it stops twelve slightly
different greys appearing across twelve screens.

### 4.8 Theming

Define colours once as CSS custom properties and refer to them by role, not by value.

```css
:root {
    --color-text-primary: #111827;
    --color-text-muted: #6b7280;
    --color-border: #e5e7eb;
    --color-surface: #ffffff;
    --color-danger: #dc2626;
}
```

Then use `text-text-muted` rather than `text-gray-500`. Role names survive a redesign; hex values do
not. This is also what makes dark mode a change to one block of CSS instead of a hunt through every
component.

---

## 5. The data layer

Pick one tool for server communication and use it everywhere. Mixing `fetch` in some places, Axios in
others and a data library in a third is how an app ends up with three different error behaviours.

RTK Query is a good default for an admin-style app, because it gives you caching, request
deduplication, loading flags and cache invalidation without you writing any of it.

### 5.1 One client, configured once

```ts
// configs/serviceConfig.ts
const baseApi = createApi({
    baseQuery: baseQueryWithErrorHandling,
    tagTypes: Object.values(ApiTagsEnum),
    endpoints: () => ({}),
    keepUnusedDataFor: 60,
    refetchOnReconnect: true,
});

export const BaseService = {appClient: baseApi};
```

Everything else injects into this one client. That is what gives you a single place to put auth
headers, token refresh and error handling.

### 5.2 One service file per backend controller

Mirror the backend's shape. If the backend has an orders controller, you have `orderService.ts`. When
someone says "the orders endpoint changed", nobody has to ask where to look.

```ts
// services/orderService.ts
const controller = "orders";

export const orderService = BaseService.appClient.injectEndpoints({
    endpoints: (builder) => ({
        getOrders: builder.query<GetOrdersResponse, GetOrdersRequest | void>({
            query: (params) => ({
                url: `/${controller}`,
                method: "GET",
                params: params ?? {},
            }),
            providesTags: [{type: ApiTagsEnum.Order, id: "LIST"}],
        }),

        createOrder: builder.mutation<CreateOrderResponse, CreateOrderRequest>({
            query: (body) => ({
                url: `/${controller}`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{type: ApiTagsEnum.Order, id: "LIST"}],
        }),

        updateOrder: builder.mutation<UpdateOrderResponse, {id: string} & UpdateOrderRequest>({
            query: ({id, ...body}) => ({
                url: `/${controller}/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: ApiTagsEnum.Order, id: "LIST"},
                {type: ApiTagsEnum.Order, id},
            ],
        }),
    }),
    overrideExisting: true,
});

export const {useGetOrdersQuery, useCreateOrderMutation, useUpdateOrderMutation} = orderService;
```

The URL is built from one `controller` constant so a route rename is one line.

### 5.3 Tags are the part people get wrong

Tags are how a mutation tells the cache what it just made stale. Get them wrong and you get the most
common bug in this kind of app: **the user saves something and the list does not change until they
reload the page.**

The trap is a partial invalidation. Say you have three queries reading orders: the paginated list,
a search used by a typeahead, and a filtered list a dropdown reads. A mutation that invalidates only
the list leaves the other two serving stale data. The screen that looks wrong is the dropdown, which
is nowhere near the code you edited.

So when you write a mutation, ask: *which queries could now be showing something out of date?* List
all of them, then invalidate all of them.

```ts
invalidatesTags: (result, _error, {id}) => [
    {type: ApiTagsEnum.Order, id: "LIST"},
    {type: ApiTagsEnum.Order, id: "SEARCH"},
    {type: ApiTagsEnum.Order, id},
],
```

If the tag you need depends on data only the response knows, read it from `result`.

### 5.4 Request and response types

Put them in `models/`, one file per controller, and type every endpoint. An untyped API layer means
every typo in a field name becomes a runtime bug on a screen somebody is demoing.

Where a field is not obvious, say so in a comment on the type itself. The type is where the next
person looks.

```ts
export type Order = {
    id: string;
    reference: string;
    /** Resolved when read, not frozen when created, so a renamed customer changes this retroactively. */
    customerName?: string;
    status: OrderStatusEnum;
    /** Minor units, so 1050 is 10.50. */
    amount: number;
};
```

---

## 6. Global error handling

This is the section that saves the most code, so it is worth being strict about.

**Decide once, in one place, what a failed request looks like to the user.** Every request goes
through the same wrapper, and that wrapper is the only thing that shows an error message.

```ts
const baseQueryWithErrorHandling = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);

    // The server answered, but said no.
    if (result.data && !isSuccessful(result.data)) {
        const message = result.data.responseMessage;
        if (message) showUniqueToast(`error-${result.data.responseCode}`, message, "error");
    }

    // The request itself failed: network, 500, timeout.
    if (result.error) {
        if (isUnauthorised(result.error)) {
            // try the refresh token, queue the request, or log out
        } else {
            showUniqueToast("error-network", friendlyMessage(result.error), "error");
        }
    }

    return result;
};
```

Three things follow from this, and they are what make it worth doing.

**Show the server's message rather than your own.** The backend knows why it refused. "This order has
already been approved" is useful. "Something went wrong" is not. Only invent a message when the
request never reached the server.

**Handle auth in the wrapper, not on screens.** A 401 should attempt a token refresh and replay the
queued requests, and log out if the refresh fails. If each screen does this, you get a race where
four requests trigger four refreshes and three of them invalidate the fourth.

**Component catch blocks then have nothing to say.** This surprises people, so it is worth stating
plainly: once the wrapper toasts every failure, the `catch` in a component is not there to tell the
user anything. It is there so a rejected promise does not go unhandled.

```tsx
const handleSubmit = async (values: FormValues) => {
    try {
        const response = await createOrder(values).unwrap();
        if (!isSuccessful(response)) return;

        toast({type: "success", message: "Order created"});
        onCreated?.();
        onModalClose?.();
    } catch (error) {
        // The reason is already on screen: the base query toasts every failure.
        // This only stops a refused request leaving an unhandled rejection.
        logger("Create order failed:", error);
    }
};
```

A second toast in that catch means the user sees the real reason and then a generic one on top of it.

---

## 7. Forms

Formik for state, Yup for rules. The two combine into one object you hand to your field components.

### 7.1 Keep schemas out of components

Put them in `models/validations/`, one file per controller, so that the rules for a thing live in one
place and a form file stays about layout.

```ts
// models/validations/orderValidation.ts
class OrderValidationSchema {
    static base() {
        return Yup.object().shape({
            reference: Yup.string().trim().required("Reference is required").max(50, "Too long"),
            customerId: Yup.string().required("Select a customer"),
            amount: Yup.number()
                .typeError("Amount must be a number")
                .required("Amount is required")
                .moreThan(0, "Amount must be greater than zero"),
        });
    }

    static create() {
        return this.base();
    }

    /** Edit allows a partial payload, so the same fields are optional here. */
    static update() {
        return this.base().shape({
            reference: Yup.string().trim().max(50, "Too long").optional(),
        });
    }
}

export const createOrderValidation = OrderValidationSchema.create();
export const updateOrderValidation = OrderValidationSchema.update();
```

Grouping create and update together matters because they drift. When the rules are next to each
other, you notice that one says 50 characters and the other says 100.

### 7.2 Conditional rules belong in the schema

When a field is required only sometimes, express that in Yup rather than with an `if` in the submit
handler. The schema stays the single answer to "what is valid".

```ts
deliveryAddress: Yup.string().when("fulfilment", {
    is: (value: string) => value === "DELIVERY",
    then: (schema) => schema.required("Delivery address is required"),
    otherwise: (schema) => schema.optional(),
}),
```

### 7.3 Write messages a person can act on

"Invalid" tells the user nothing. "Reference must be at most 50 characters" tells them what to do.
Every message should name the field and the fix.

---

## 8. Modals, and why forms must not live inside them

Most codebases that get hard to change have the same shape: a modal component that contains a form,
which contains an API call, which contains a toast, which refreshes a table it reaches through a
prop. Five responsibilities in one file. Nothing in it can be used anywhere else.

Separate them like this:

- **The modal shell** owns presentation: overlay, title, close.
- **The form component** owns fields and validation. It takes initial values and an `onSubmit`. It
  does not know it is in a modal.
- **The caller** owns what happens afterwards: refresh the table, navigate, show a toast.

The payoff is that the same form works in a modal, on a full page, and inside a wizard step, with no
changes.

### 8.1 Open modals as promises, not as state

The usual approach puts a boolean in the parent for every modal, plus the data the modal needs, plus
an effect to reset it on close. Three pieces of state per modal, in a component that has nothing to
do with modals.

A registry library such as `@ebay/nice-modal-react` replaces all of that with a function call.

```tsx
const orderModal = useModal(OrderFormModal);

const handleCreate = useCallback(async () => {
    await orderModal.open({onCreated: () => tableRef.current?.refresh()});
}, [orderModal]);

const handleEdit = useCallback(async (order: Order) => {
    await orderModal.open({order, isUpdate: true, onCreated: () => tableRef.current?.refresh()});
}, [orderModal]);
```

No `isOpen`, no `selectedOrder`, no cleanup. The thin wrapper is all you need:

```tsx
export function useModal<T = Record<string, unknown>>(component: FC<ModalProps & T>) {
    return {
        open: async (props: T) => await NiceModal.show(component, props),
    };
}
```

Because `open` returns a promise, the caller can wait for a result, which is what makes confirmation
dialogs read like ordinary code.

### 8.2 Confirmation dialogs: put the call inside

Any irreversible action gets a confirmation: delete, suspend, approve, reject, cancel.

The subtle part is where the API call goes. It belongs **inside** the dialog's confirm handler, not
after the promise resolves.

```tsx
// Correct: the dialog stays up, with its spinner, until the call finishes.
const confirmed = await confirm({
    title: "Delete order",
    message: `Delete "${order.reference}"? This cannot be undone.`,
    confirmText: "Delete",
    variant: "danger",
    onConfirmAction: async () => {
        const response = await deleteOrder({id: order.id}).unwrap();
        if (isSuccessful(response)) {
            toast({type: "success", message: "Order deleted"});
            tableRef.current?.refresh();
        }
    },
});
if (!confirmed) return;
```

```tsx
// Wrong: the dialog closes, then the call runs with nothing on screen.
const confirmed = await confirm({title: "Delete order"});
if (confirmed) {
    await deleteOrder({id: order.id});
}
```

In the wrong version the user presses Delete, the dialog vanishes immediately, and for two seconds
nothing indicates that anything is happening. If it fails, they have already moved on.

---

## 9. Tables

### 9.1 Define the fetch function separately

```tsx
const fetchRows = useCallback(
    async (params: ServerSideParams): Promise<TableRows<Order>> => {
        try {
            const response = await fetchOrders({
                page: params.pageNumber ?? 1,
                size: params.pageSize,
                status: statusFilter,
            }).unwrap();

            return {
                data: response?.data ?? [],
                totalRecords: response?.totalItems,
                totalPages: response?.totalPages,
            };
        } catch (error) {
            logger("Fetch orders failed:", error);
            return {data: []};
        }
    },
    [fetchOrders, statusFilter],
);

<Table columns={columns} fetchRows={fetchRows} uniqueRowId="id" />
```

Inline it and you create a new function on every render, which a grid will read as "the data source
changed", and it will refetch in a loop.

### 9.2 Columns go outside the component

Column definitions are usually constant. Defining them inside the component rebuilds them on every
render, and a grid that compares column identity will tear down and rebuild its header each time.

Put them at module level, or in `useMemo` when they genuinely depend on something.

### 9.3 Two kinds of row action

Keep them visually distinct: a small set of icon actions in a column for the common operations
(view, edit, delete), and a three-dot menu for the rest (approve, suspend, export). When everything
goes in the menu, the common action takes two clicks forever.

---

## 10. State: server state is not app state

This is the single most common structural mistake. It looks like this:

```tsx
const {data} = useGetOrdersQuery();
const [orders, setOrders] = useState([]);

useEffect(() => {
    if (data) setOrders(data.data);
}, [data]);
```

Now there are two copies of the orders, and they can disagree. Every mutation has to remember to
update both, and the bug when it forgets is invisible until someone notices a stale row.

Read from the query directly. Derive with `useMemo`. The cache is your state.

```tsx
const {data, isFetching} = useGetOrdersQuery();
const orders = data?.data ?? [];
const pendingOrders = useMemo(() => orders.filter((o) => o.status === "PENDING"), [orders]);
```

Keep a client state store for things the server does not own: the open or closed sidebar, a theme
choice, a multi-step form in progress, the signed-in user's session. That is a short list. If the
server knows it, let the query layer hold it.

---

## 11. Naming

Consistency matters more than the particular convention. Pick these and stop thinking about it:

- **Files:** camelCase. `orderService.ts`, `ordersContent.tsx`, `createOrderModal.tsx`
- **Components:** PascalCase inside the file. `OrdersContent`, `CreateOrderModal`
- **Folders:** lowercase. `datagrid`, `orders`, `modals`
- **Booleans:** `is`, `has`, `can`. `isLoading`, `hasPermission`, `canEdit`
- **Handlers:** `handleX` for the definition, `onX` for the prop. `onSubmit={handleSubmit}`
- **Types:** `CreateOrderRequest`, `GetOrdersResponse`, `Order` for the entity
- **Enums:** singular with an `Enum` suffix, values in SCREAMING_SNAKE. `OrderStatusEnum.PENDING`

Name files after what they are, with the type as the suffix: `orderValidation.ts`, `orderService.ts`,
`ordersContent.tsx`. Sorting a folder then groups things that belong together.

---

## 12. When to pull a function out

The useful question is not "is this long" but "does anything depend on this being the same function
next render".

**Pull it out** when it is passed as a prop to a child, used in more than one place, listed in a
dependency array, or complex enough that a name would explain it. Use `useCallback` for the first
three.

```tsx
const handleRefresh = useCallback(() => tableRef.current?.refresh(), []);

<TableHeader onRefresh={handleRefresh} />
<EmptyState onRefresh={handleRefresh} />
```

**Leave it inline** when it is a one-line setter, a `.map` callback, or used once right where it is
written.

```tsx
<Button text="Filter" onClick={() => setFiltersOpen(true)} />
{orders.map((order) => <Row key={order.id} order={order} />)}
```

Do not wrap everything in `useCallback` as a reflex. It has a cost of its own, and on a handler that
goes to a plain DOM element it buys you nothing.

One trap worth naming: a function in a dependency array that is recreated every render will restart
the effect every render. If an effect keeps firing, look at what it depends on before anything else.

---

## 13. Comments

Comment the **why**, never the what. The code already says what it does.

```tsx
// Bad: says what the line says.
// Set loading to true
setLoading(true);

// Good: says something the code cannot.
// Kept in the modal rather than toasted: a rejected upload needs the reader to go and fix
// a file, and a toast is gone before they can write any of it down.
const [failure, setFailure] = useState<Failure | null>(null);
```

The comments worth writing are the ones that stop someone undoing your work:

- why a non-obvious approach was chosen over the obvious one
- what a field means when its name does not say
- a constraint from outside the code, such as an API that paginates differently from the rest
- a trap you already fell into

If you cannot think of a why, leave it out. A file of narrated obvious lines is harder to read than
one with none, and it goes stale the first time someone edits the line without the comment.

---

## 14. The refactor, in order

Do not try to do this in one pass. Each step should leave the app working.

**Step 1: Folders.** Move files into the structure in section 2 without changing any code. Fix the
imports. Commit. This is boring and it makes everything after it easier to see.

**Step 2: The API client.** Create the single client and the error-handling wrapper. Move one
controller's calls into a service file and point one screen at it. Prove the toast on failure works.
Commit.

**Step 3: The rest of the services.** Move the remaining calls across, one controller at a time.
Delete every `try/catch` that only shows a generic message, now that the wrapper covers it. Commit
after each controller.

**Step 4: The UI components.** Build `Button`, `Input`, `Select` and `ModalLayout` first, since
they appear on every screen. Convert one screen completely to prove the shapes are right before you
convert the rest.

**Step 5: Forms.** Move validation into `models/validations/`. Split any form out of the modal that
contains it. Convert modals to the registry pattern, one at a time.

**Step 6: Tables.** Build the wrapper, move columns to module level, and give every table the same
header, pagination and empty state.

**Step 7: State.** Hunt for `useState` that mirrors query data and delete it. This is usually the
step that removes the most lines.

**Step 8: Theme tokens.** Replace hard-coded colours with role-named variables. Last, because it
touches many files and changes no behaviour, so it is the easiest to review.

If you only have time for part of this, do steps 2, 3 and 7. Those three are where the actual bugs
are.

---

## 15. Smells to grep for

A quick pass to find the worst of it.

| Search for | What it usually means |
|---|---|
| `useState` next to a query hook | A duplicated copy of server state. Section 10. |
| `catch` with a toast inside | Double error messages. Section 6. |
| `fetch(` or `axios.` outside `services/` | A call that skips your error handling entirely. |
| `<input` or `<button` in `content/` | A field or button that will not follow the next redesign. |
| `isOpen` or `showModal` | Modal state that the registry pattern removes. Section 8. |
| `text-gray-`, `bg-white`, hex codes | Styling that will not survive a theme change. Section 4.8. |
| `: any` | A type nobody finished. |
| A file over 400 lines | Something that wants splitting. |
| `fetchRows={async () =>` | An inline data source that will refetch in a loop. Section 9.1. |
| `useEffect` with no dependency array | Runs on every render. Almost always a mistake. |

---

## In short

If you remember five things:

1. Generic components never import feature code. The dependency runs one way.
2. Every request goes through one wrapper, and that wrapper is the only thing that shows an error.
3. The query cache is your server state. Do not copy it into `useState`.
4. A form does not know it is in a modal.
5. Comment the why. The code already says the what.

The rest is detail you can look up. These five are what decide whether the project is still pleasant
to work in six months from now.
